# HU-027: Mejoras de Consolidación del Catálogo

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-027 |
| **Estado** | Pendiente |
| **Fecha** | 2026-03-02 |
| **Prioridad** | Alta |
| **Estimación** | 5 horas (~1 día) |

---

## 1. Historia de Usuario

**Como** administrador del sistema,  
**Quiero** que el script de consolidación pueda procesar el catálogo completo (~55.000 libros) sin crashear por memoria, y que el campo `description` admita hasta 10.000 caracteres en todo el sistema,  
**Para** garantizar que las descripciones extensas no se pierdan ni se corten durante la consolidación y carga inicial de datos.

---

## 2. Contexto y Motivación

### 2.1 Problema de memoria en `consolidate-books.ts`

Durante la ejecución del script de consolidación contra el catálogo completo (~55.315 libros), el proceso crashea con el error `JavaScript heap out of memory`. Se identificaron dos causas raíz:

**Causa 1 — Doble buffer en memoria:**  
El array `booksToProcess[]` (55k libros completos) y el array `consolidatedBooks[]` (55k libros con traducciones) coexisten en memoria simultáneamente durante toda la Fase 2 más la escritura de ficheros. En el momento de mayor presión, Node.js intenta mantener ambos arrays completos a la vez, superando el límite de heap por defecto (~1.7GB).

**Causa 2 — Caché de traducciones sin límite:**  
El objeto `cache` de traducciones crece sin límite durante toda la ejecución, acumulando ~55k entradas en memoria antes de ser persistido.

**Solución:**  
Liberar `booksToProcess[]` (`booksToProcess.length = 0`) justo después de completar la Fase 2 y antes de iniciar la escritura de ficheros de output. Adicionalmente, formalizar `--max-old-space-size=4096` en el script de `package.json` para el comando de consolidación.

### 2.2 Problema del límite de 5.000 caracteres en `description`

El campo `description` está limitado a 5.000 caracteres en múltiples capas del sistema (dominio, HTTP schemas, servicios de traducción, y base de datos). Durante la consolidación del catálogo real se detectaron descripciones en los datos fuente que superan ese límite, lo que provoca que se trunquen o rechacen.

Se identificaron **todas las capas** donde existe este límite:

| Capa | Fichero | Cambio necesario |
|------|---------|-----------------|
| Dominio | `src/domain/entities/Book.ts` | `DESCRIPTION_MAX_LENGTH: 5000 → 10000` |
| HTTP Schema | `src/infrastructure/driver/http/schemas/book.schemas.ts` | `.max(5000) → .max(10000)` |
| Traducción (Ollama) | `src/infrastructure/driven/translation/OllamaTranslationService.ts` | `MAX_TEXT_LENGTH: 5000 → 10000` |
| Traducción (LibreTranslate) | `src/infrastructure/driven/translation/LibreTranslateTranslationService.ts` | `MAX_TEXT_LENGTH: 5000 → 10000` |
| Base de datos | `docs/db/init-db.sql` | `VARCHAR(5000) → TEXT` en `original_description` y `description` |

> **Nota:** El schema de Drizzle (`schema.ts`) ya usa `text()` sin límite. `init-db.sql` tiene una inconsistencia preexistente con `VARCHAR(5000)` que también se corrige en esta HU.

---

## 3. Solución Técnica

### 3.1 Optimización de memoria

```typescript
// apps/api/scripts/consolidate-books.ts
// Fase 2: procesar y traducir libros
// ...

// Liberar memoria antes de escribir ficheros
booksToProcess.length = 0;

// Fase 3: escribir ficheros particionados
// ...
```

En `package.json`:
```json
{
  "scripts": {
    "consolidate": "NODE_OPTIONS=--max-old-space-size=4096 tsx scripts/consolidate-books.ts"
  }
}
```

### 3.2 Ampliar límite de `description`

**`Book.ts`:**
```typescript
static readonly FIELD_CONSTRAINTS = {
  DESCRIPTION_MAX_LENGTH: 10000,  // antes: 5000
  // ...
};
```

**`book.schemas.ts`:**
```typescript
description: z.string().max(10000, 'Description exceeds maximum length'),
```

**`OllamaTranslationService.ts` y `LibreTranslateTranslationService.ts`:**
```typescript
const MAX_TEXT_LENGTH = 10000;  // antes: 5000
```

**`docs/db/init-db.sql`:**
```sql
original_description TEXT,   -- antes: VARCHAR(5000)
description          TEXT,   -- antes: VARCHAR(5000)
```

---

## 4. Criterios de Aceptación

### AC-1: Optimización de memoria en `consolidate-books.ts`

- [ ] El array `booksToProcess` se libera (`booksToProcess.length = 0`) antes de iniciar la escritura de ficheros de output.
- [ ] El script completa la consolidación del catálogo completo (~55k libros) sin error `heap out of memory`.
- [ ] El comando `npm run consolidate` en `apps/api/package.json` incluye `NODE_OPTIONS=--max-old-space-size=4096`.

### AC-2: Límite de `description` ampliado a 10.000 caracteres

- [ ] `Book.FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH` es `10000`.
- [ ] El schema HTTP de `book.schemas.ts` valida `description` con `.max(10000)`.
- [ ] `OllamaTranslationService` no trunca textos menores a 10.000 caracteres.
- [ ] `LibreTranslateTranslationService` no trunca textos menores a 10.000 caracteres.
- [ ] `docs/db/init-db.sql` define los campos `original_description` y `description` de la tabla `books` como `TEXT`.

### AC-3: Tests actualizados

- [ ] Todos los tests que referenciaban el límite de 5.000 están actualizados a 10.000.
- [ ] No hay tests eliminados, solo actualizados.
- [ ] Todos los tests (unit + integration) siguen en verde.

### AC-4: Documentación actualizada

- [ ] `docs/api/data-loading-schema.md` refleja el nuevo límite de 10.000 caracteres en el campo `description`.
- [ ] `README.md` tiene las instrucciones de consolidación actualizadas (LibreTranslate, variables de entorno reales, aviso de OOM y solución).
- [ ] `docs/user_stories/08-hu-011-consolidate-books.md` refleja el estado real del script (ficheros particionados, LibreTranslate como traductor principal).

---

## 5. Tareas de Implementación

### Tarea 1: Optimización de memoria en `consolidate-books.ts`

**Estimación**: 30 minutos  
**Branch**: `task/HU-027-01-memory-optimization`

- [ ] Añadir `booksToProcess.length = 0` tras completar la Fase 2 en `consolidate-books.ts`.
- [ ] Añadir `NODE_OPTIONS=--max-old-space-size=4096` al script `consolidate` en `apps/api/package.json`.
- [ ] Verificar que el script completa sin OOM con el catálogo completo.

### Tarea 2: Ampliar límite de `description` a 10.000 caracteres

**Estimación**: 2 horas  
**Branch**: `task/HU-027-02-description-max-length`

- [ ] Actualizar `DESCRIPTION_MAX_LENGTH` en `src/domain/entities/Book.ts`.
- [ ] Actualizar `.max(5000)` en `src/infrastructure/driver/http/schemas/book.schemas.ts`.
- [ ] Actualizar `MAX_TEXT_LENGTH` en `src/infrastructure/driven/translation/OllamaTranslationService.ts`.
- [ ] Actualizar `MAX_TEXT_LENGTH` en `src/infrastructure/driven/translation/LibreTranslateTranslationService.ts`.
- [ ] Actualizar `docs/db/init-db.sql`: `VARCHAR(5000) → TEXT` en `original_description` y `description`.
- [ ] Actualizar tests afectados:
  - `tests/unit/domain/entities/Book.test.ts`
  - `tests/unit/infrastructure/driver/http/errors/HttpErrorMapper.test.ts`
  - `tests/unit/infrastructure/driven/translation/OllamaTranslationService.test.ts`
  - `tests/unit/infrastructure/driven/translation/LibreTranslateTranslationService.test.ts`
  - `tests/integration/infrastructure/translation/OllamaTranslationService.integration.test.ts`
  - `tests/integration/infrastructure/translation/LibreTranslateTranslationService.integration.test.ts`

### Tarea 3: Actualización de documentación

**Estimación**: 1.5 horas  
**Branch**: `task/HU-027-03-update-docs`

- [ ] Actualizar `docs/api/data-loading-schema.md`: nuevo límite de 10.000 en campo `description`.
- [ ] Actualizar `README.md`:
  - Reemplazar instrucciones Ollama por LibreTranslate en la sección de consolidación.
  - Añadir variables de entorno necesarias (`TRANSLATION_PROVIDER`, `LIBRETRANSLATE_URL`).
  - Añadir aviso de OOM y la solución aplicada.
- [ ] Actualizar `docs/user_stories/08-hu-011-consolidate-books.md`:
  - Reflejar que el output son ficheros particionados (no `books.json` único).
  - Reflejar que LibreTranslate es el proveedor de traducción para consolidación masiva.

---

## 6. Definition of Done

- [ ] Script `consolidate-books.ts` procesa 55k libros sin OOM.
- [ ] `DESCRIPTION_MAX_LENGTH` es 10.000 en todas las capas del sistema.
- [ ] `docs/db/init-db.sql` usa `TEXT` en los campos `original_description` y `description`.
- [ ] Todos los tests afectados actualizados a 10.000 (0 tests eliminados).
- [ ] 0 errores de lint, 0 errores de tipo, todos los tests en verde.
- [ ] Documentación actualizada: `data-loading-schema.md`, `README.md`, `hu-011`.
- [ ] Commits realizados con el estándar Conventional Commits.

---

**Historia creada**: Lunes, 2 de Marzo, 2026  
**Estimación**: 5 horas (~1 día)  
**Prioridad**: Alta  
**Complejidad**: Baja (cambios bien localizados, sin impacto en arquitectura)
