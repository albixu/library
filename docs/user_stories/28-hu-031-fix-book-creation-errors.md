# HU-031: Corrección de errores en la creación de libros del catálogo

## Descripción

Como administrador del sistema,  
quiero que el proceso de seed pueda insertar correctamente el 100% de los libros del catálogo,  
para que ningún libro quede fuera de la biblioteca por errores de infraestructura o de calidad de datos.

---

## Contexto técnico

Durante la ejecución del seed sobre los 55.315 libros del catálogo (verificación post HU-029/HU-030), se detectaron **55 errores de inserción** agrupados en tres categorías distintas:

| Tipo de error | Libros afectados | Causa raíz |
|---|---|---|
| `value too long for character varying(13)` | 1 | La columna `isbn` en BD es `varchar(13)` — heredada de cuando solo existía ISBN. `BookIdentifier` acepta hasta 32 chars, pero la BD no. |
| `Embedding text too long` | ~37 | El modelo `nomic-embed-text` tiene un límite de contexto (~7.000 chars). `getTextForEmbedding()` concatena título + autores + tipo + categorías + descripción. Las descripciones largas superan ese límite. |
| `Duplicate value in "authors"` | ~17 | Los JSON fuente contienen autores duplicados en el mismo libro (ej. `["John Doe", "John Doe"]`). `Book.validateAuthors()` lanza `DuplicateItemError`, bloqueando la inserción. |

---

## Criterios de aceptación

### CA-1: Columna `isbn` ampliada a `varchar(32)`
- La columna `isbn` en la tabla `books` se amplía de `varchar(13)` a `varchar(32)` mediante migración Drizzle.
- El schema Drizzle (`schema.ts`) refleja el nuevo tamaño.
- Todos los libros con identificadores de hasta 32 chars se pueden insertar sin error de truncado.
- Los 55.260 libros existentes en BD no se ven afectados.

### CA-2: Embeddings con chunks solapados para descripciones largas
- El `OllamaEmbeddingService` ya no rechaza textos largos con `EmbeddingTextTooLongError`.
- Si el texto de entrada supera el límite del modelo, se divide en **chunks con solapamiento**.
- Cada chunk respeta el **máximo que el modelo acepta sin errores** (configurable, default: 6.500 chars para dejar margen de seguridad respecto al límite de 7.000).
- El solapamiento entre chunks consecutivos es de **200 chars** para preservar el contexto semántico en los cortes.
- Los embeddings de cada chunk se **promedian** para producir un único vector de 768 dimensiones representativo del texto completo.
- El vector resultante se normaliza (L2) tras el promedio para mantener la consistencia con los embeddings de textos cortos (que Ollama devuelve normalizados).
- Para textos que caben en un solo chunk (la gran mayoría), el comportamiento es **idéntico al actual** — cero cambios en rendimiento ni calidad.
- El puerto `EmbeddingService` no cambia su firma (`generateEmbedding(text): Promise<EmbeddingResult>`): el chunking es un detalle de implementación del adaptador.
- Se añade un nuevo método privado testeable: `splitIntoChunks(text, chunkSize, overlap): string[]`.

### CA-3: Deduplicación de autores en dominio y en scripts
- **`Book.validateAuthors()`** deduplica silenciosamente autores repetidos por nombre (case-insensitive) en lugar de lanzar `DuplicateItemError`. Los duplicados se eliminan conservando la **primera aparición**.
- **`consolidate-books.ts`**: al leer los libros fuente, se deduplicar los autores del array antes de procesarlos.
- **`seed-database.ts`**: al transformar el `SourceBook`, se deduplicar los autores del array antes de pasarlos al use case.
- La deduplicación en scripts es por **nombre exacto** (trim + case-insensitive).

### CA-4: El seed completa al 100%
- Al re-ejecutar el seed tras todos los cambios:
  - `Created: 55` (los 55 libros previamente fallidos se insertan).
  - `Errors: 0`.
  - Total acumulado en BD: **55.315 libros**.

### CA-5: Tests actualizados y en verde
- Tests unitarios del comportamiento de chunking en `OllamaEmbeddingService`.
- Tests unitarios de `Book.validateAuthors()` para el nuevo comportamiento de deduplicación.
- Cobertura mínima: 100% del código nuevo/modificado.
- Todos los tests existentes siguen pasando.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `apps/api/src/infrastructure/driven/persistence/drizzle/schema.ts` | `isbn: varchar('isbn', { length: 13 })` → `varchar(32)` |
| `apps/api/src/infrastructure/driven/embedding/OllamaEmbeddingService.ts` | Reemplazar rechazo por chunking con solapamiento + promedio de vectores |
| `apps/api/src/domain/entities/Book.ts` | `validateAuthors()`: deduplicar por nombre en vez de lanzar error |
| `apps/api/scripts/consolidate-books.ts` | Deduplicar autores al leer/procesar cada libro fuente |
| `apps/api/scripts/seed-database.ts` | Deduplicar autores en `transformSourceBook()` |
| `apps/api/tests/unit/infrastructure/embedding/OllamaEmbeddingService.test.ts` | Tests del chunking |
| `apps/api/tests/unit/domain/entities/Book.test.ts` | Tests del nuevo comportamiento de deduplicación |
| Migración Drizzle (nueva, generada) | `ALTER TABLE books ALTER COLUMN isbn TYPE varchar(32)` |

---

## Tareas técnicas

### Tarea 1 — Ampliar columna `isbn` a `varchar(32)` (schema + migración)
- Actualizar `schema.ts`: cambiar `varchar('isbn', { length: 13 })` → `varchar('isbn', { length: 32 })`.
- Generar la migración Drizzle: `npm run db:generate`.
- Verificar que la migración SQL generada hace `ALTER COLUMN isbn TYPE varchar(32)`.
- Ejecutar la migración en el entorno de dev: `npm run db:migrate`.
- Verificar que el libro `43574CHAZAUSTIN` (15 chars) se puede insertar.

### Tarea 2 — Chunking con solapamiento en `OllamaEmbeddingService`
- Eliminar el bloque que lanza `EmbeddingTextTooLongError` para textos largos.
- Implementar `private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[]`:
  - Si el texto cabe en un chunk, devuelve `[text]`.
  - En caso contrario, divide con sliding window: cada chunk empieza en `i * (chunkSize - overlap)`.
  - El último chunk puede ser más corto.
- Implementar el flujo principal en `generateEmbedding`:
  1. Dividir el texto en chunks.
  2. Generar un embedding por chunk (llamadas secuenciales al modelo).
  3. Promediar los vectores dimensión a dimensión.
  4. Normalizar el vector promedio (L2 norm).
  5. Devolver el `EmbeddingResult` con el vector normalizado.
- Exponer `CHUNK_SIZE` (6.500) y `CHUNK_OVERLAP` (200) como constantes del módulo.
- Actualizar los tests unitarios.

### Tarea 3 — Deduplicación de autores (dominio + scripts)
- En `Book.ts` → `validateAuthors()`: antes del bucle de duplicados, añadir deduplicación por nombre (trim + toLowerCase). Conservar primera aparición. Mantener el resto de validaciones (vacío, máximo).
- En `consolidate-books.ts` → `transformBook()` o en la lectura: deduplicar `source.authors` por nombre (trim + toLowerCase).
- En `seed-database.ts` → `transformSourceBook()`: deduplicar `source.authors` por nombre (trim + toLowerCase).
- Actualizar los tests unitarios de `Book`.

### Tarea 4 — Verificación integral del seed
- Levantar el entorno de seed.
- Ejecutar `seed:database` completo contra los 55.315 libros.
- Confirmar: `Created: 55`, `Errors: 0`, total BD = 55.315.

---

## Notas técnicas

### Sobre el chunking
- El `EmbeddingTextTooLongError` **se mantiene en `DomainErrors.ts`** — puede ser útil en otros contextos. Simplemente deja de usarse en `OllamaEmbeddingService`.
- La normalización L2 tras el promedio es importante: Ollama devuelve vectores normalizados (norma = 1). Al promediar varios vectores normalizados, el vector resultante tiene norma < 1. La normalización restaura esa propiedad para que las búsquedas por cosine similarity sean correctas.
- El solapamiento de 200 chars es conservador: evita cortar frases a la mitad sin generar demasiada redundancia entre chunks.
- La gran mayoría de libros (~99,9%) tienen un texto de embedding < 6.500 chars → para ellos el comportamiento es exactamente el mismo que hoy (un solo chunk = sin promedio = sin normalización extra).

### Sobre la deduplicación de autores en el dominio
- El cambio de "lanzar error" a "deduplicar silenciosamente" es una decisión consciente de robustez: una biblioteca personal no debería rechazar un libro porque sus metadatos tengan un autor listado dos veces. El sistema debe ser tolerante con datos sucios de entrada.
- La deduplicación en `consolidate-books.ts` y `seed-database.ts` actúa como primera línea de defensa para limpiar los datos en origen. La deduplicación en el dominio es la red de seguridad final.
- Se conserva la validación de "authors no puede estar vacío" y "máximo 10 autores" (aplicadas sobre el array ya deduplicado).

### Sobre la migración de BD
- `varchar(13)` → `varchar(32)` en PostgreSQL es una operación **no destructiva** que no requiere reescritura de la tabla. Es segura para ejecutar en producción con datos.
- La migración aplica a los entornos dev, seed y prod por igual.
