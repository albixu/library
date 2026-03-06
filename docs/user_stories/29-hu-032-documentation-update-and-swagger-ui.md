# HU-032: Actualización de Documentación Técnica e Integración de Swagger UI

## Descripción

**Como** desarrollador o contribuidor del proyecto,  
**Quiero** que toda la documentación técnica refleje el estado real del sistema y que la API disponga de una interfaz gráfica interactiva (Swagger UI),  
**Para** poder trabajar con información fiable y explorar la API sin necesidad de herramientas externas.

---

## Contexto y motivación

Tras completar las HU-020 a HU-031, se realizó una auditoría exhaustiva de toda la documentación del proyecto. Se identificaron múltiples desincronizaciones críticas entre los documentos y el estado real del código:

### Divergencias detectadas

#### `docs/design_docs/01-project-overview.md`
- Referencia a **Angular 19** — versión actual es **Angular 21**.
- Diagrama de arquitectura muestra el modelo `aya-expanse:8b` para traducciones — nunca se usó; se usó `llama3.2:1b` y posteriormente **LibreTranslate** como proveedor principal (HU-026).

#### `docs/design_docs/02-project-structure.md`
- Versión Angular sigue siendo **19.x** en la tabla de stack.
- Árbol de directorios **masivamente desactualizado**: no incluye `docs/diagrams/`, `docs/web/`, `initial_data/` en raíz, `scripts/`, ni las HUs 014–031.
- Referencia a `docs/db/books.json` que ya no existe (datos movidos a `initial_data/` en raíz — HU-030).
- No incluye `LibreTranslateTranslationService.ts` (HU-026) ni `docker-compose.consolidate.yml` / `docker-compose.seed.yml`.

#### `docs/design_docs/03-web-client-design.md`
- **Desincronización crítica**: el documento entero está escrito asumiendo **Angular Material**, que fue eliminado completamente en HU-020 y reemplazado por **Tailwind CSS**.
- Referencias a componentes Material (`mat-sidenav`, `mat-table`, `mat-select`, `mat-dialog`, etc.) que ya no existen.
- Estructura de features referencia `book-search/` y `book-detail/` — la estructura real es `catalog/` (Screaming Architecture, HU-015+).
- Sección de Roadmap marca como pendiente "Fase 5: Dockerización" — completada en HU-017.
- La sección de theming y estilos es completamente inaplicable tras la migración a Tailwind.

#### `docs/design_docs/04-api-design.md`
- `GET /api/book-categories` y `GET /api/book-levels`: parámetro de filtro documentado como `typeId` — el real es `type` (nombre, no ID).
- Índice de BD documentado como `ivfflat` — el real es **HNSW** (cambiado en HU-007/HU-008).
- Tabla `levels` documentada con FK directa `type_id` — la implementación usa **tabla de unión** `type_levels` (N:M).
- Campo `authors` max length: 200 chars documentados — real: **300 chars**.
- Campo `isbn` documentado como `varchar(13)` — HU-031 lo cambió a **varchar(32)**.
- Value Object `ISBN` documentado — renombrado a `BookIdentifier` en HU-029.
- `Book.validateAuthors()` documentada como "lanza `DuplicateItemError`" — HU-031 cambió el comportamiento a **deduplicación silenciosa**.
- `EmbeddingTextTooLongError` documentada como error de salida — HU-031 cambió el comportamiento a **chunking con solapamiento**.
- `format` enum solo muestra `pdf, epub, mobi, azw3` — faltan `djvu, cbz, cbr, txt, other`.
- No incluye `LibreTranslateTranslationService` en los adaptadores driven (HU-026).

#### `docs/api/openapi.yaml`
- Campo `isbn` descrito como ISBN-10/ISBN-13 exclusivamente — HU-029 lo cambió a `BookIdentifier` (cualquier cadena alfanumérica de 1–32 chars).
- Mensajes de error del campo `isbn` todavía muestran el texto del error anterior.
- Errores 503 de traducción mencionan solo `llama3.2:1b` — deben incluir también LibreTranslate (HU-026).

#### `docs/db/init-db.sql`
- Columna `isbn` sigue declarada como `VARCHAR(13)` — debe ser **`VARCHAR(32)`** (HU-031).

#### `README.md`
- Referencia a `docs/db/books.json` que ya no existe.
- Sección de seed de producción no refleja el uso de `docker-compose.seed.yml`.
- Falta guía paso a paso de **instalación en producción** (VPS desde cero).
- Faltan instrucciones para todos los entornos: dev, prod, test, consolidate, seed.
- Faltan instrucciones para la carga de libros, transformación de JSON y otras operaciones.
- No existe ninguna mención a **Swagger UI** (que se añadirá en esta HU).

### Nueva funcionalidad incluida: Swagger UI
Adicionalmente, se ha identificado la necesidad de exponer una **interfaz gráfica interactiva** de la API para facilitar la exploración y prueba de endpoints sin herramientas externas. Se integrará **Swagger UI** directamente en la API de Fastify, sirviendo el `openapi.yaml` ya existente.

---

## Criterios de Aceptación

### CA-1: `docs/design_docs/01-project-overview.md` actualizado
- La versión de Angular refleja **Angular 21** (o la versión real instalada).
- El diagrama de arquitectura muestra correctamente los proveedores de traducción: **LibreTranslate** (primario) y **Ollama / llama3.2:1b** (secundario / embeddings).
- No aparece referencia a `aya-expanse:8b`.

### CA-2: `docs/design_docs/02-project-structure.md` actualizado
- La tabla de stack refleja la versión real de Angular.
- El árbol de directorios incluye: `docs/diagrams/`, `docs/web/`, `initial_data/` (raíz), `original_data/` (raíz), `scripts/`, `docker-compose.consolidate.yml`, `docker-compose.seed.yml`.
- El árbol de directorios de la API incluye `LibreTranslateTranslationService.ts`.
- La lista de historias de usuario refleja HU-001 hasta HU-032.
- Se elimina la referencia a `docs/db/books.json`.

### CA-3: `docs/design_docs/03-web-client-design.md` actualizado
- El documento refleja la arquitectura **Tailwind CSS** (sin ninguna referencia a Angular Material).
- La estructura de features usa `catalog/` en lugar de `book-search/` + `book-detail/`.
- La sección de theming/estilos describe la configuración de Tailwind.
- La Fase 5 de Dockerización se marca como completada.
- Se elimina o se actualiza correctamente cualquier referencia a `mat-*` components.

### CA-4: `docs/design_docs/04-api-design.md` actualizado
- El parámetro de filtro de `GET /api/book-categories` y `GET /api/book-levels` se documenta como `type` (nombre).
- El índice de BD se documenta como **HNSW**.
- La tabla `levels` y su relación con tipos se documenta con la tabla de unión `type_levels`.
- `authors` max length se documenta como 300 chars.
- El campo `isbn` se documenta como `varchar(32)` con el nombre conceptual `BookIdentifier` (1–32 chars alfanuméricos).
- `Book.validateAuthors()` se documenta con el comportamiento de **deduplicación silenciosa**.
- `EmbeddingTextTooLongError` se documenta como **no activa** en producción (chunking toma su lugar).
- El `format` enum incluye todos los valores: `pdf, epub, mobi, azw3, djvu, cbz, cbr, txt, other`.
- `LibreTranslateTranslationService` aparece en la lista de adaptadores driven.

### CA-5: `docs/api/openapi.yaml` actualizado
- El campo `isbn` (ahora semánticamente `bookIdentifier`) tiene su descripción, validación y ejemplos de error actualizados para reflejar la aceptación de cualquier cadena alfanumérica de 1–32 chars.
- Los errores 503 de traducción mencionan ambos proveedores: Ollama y LibreTranslate.

### CA-6: `docs/db/init-db.sql` actualizado
- La declaración de la columna `isbn` usa `VARCHAR(32)`.

### CA-7: Swagger UI integrado en la API
- El paquete `@fastify/swagger-ui` (y si es necesario `@fastify/swagger`) está instalado en `apps/api`.
- Swagger UI está disponible en la ruta `/docs` de la API (accesible en `http://localhost:3000/docs` en dev).
- Swagger UI sirve el `openapi.yaml` existente en `docs/api/openapi.yaml`.
- La ruta `/docs` solo está habilitada en entornos `development` y `test` (no en `production`).
- Los tipos TypeScript son correctos, sin errores de compilación.

### CA-8: `README.md` actualizado
- Se elimina la referencia a `docs/db/books.json`.
- La sección de seed de producción documenta correctamente el uso de `docker-compose.seed.yml`.
- Se añade una sección completa de **Swagger UI**: descripción, URL de acceso y nota sobre disponibilidad solo en dev/test.
- Se añade o se amplía la sección de **instalación en producción** con pasos desde cero (VPS).
- Se documentan todos los entornos disponibles: dev, prod, test, consolidate, seed.
- Se documentan los comandos de carga de libros, transformación de JSON y operaciones del catálogo.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `docs/user_stories/29-hu-032-documentation-update-and-swagger-ui.md` | Nuevo (este documento) |
| `docs/design_docs/01-project-overview.md` | Actualización |
| `docs/design_docs/02-project-structure.md` | Actualización |
| `docs/design_docs/03-web-client-design.md` | Reescritura parcial (Tailwind) |
| `docs/design_docs/04-api-design.md` | Actualización |
| `docs/api/openapi.yaml` | Actualización |
| `docs/db/init-db.sql` | Actualización |
| `apps/api/package.json` | Nueva dependencia: `@fastify/swagger-ui` |
| `apps/api/src/` | Registro de Swagger UI en Fastify |
| `README.md` | Actualización + Swagger UI + guía producción |

---

## Tareas técnicas

### Tarea 1 — Actualizar `docs/design_docs/01-project-overview.md`
**Branch**: `task/HU-032-01-update-overview-doc`

- [ ] Corregir versión de Angular a la real (Angular 21).
- [ ] Actualizar el diagrama/descripción de arquitectura para reflejar LibreTranslate como proveedor primario de traducción y Ollama/llama3.2:1b como secundario/embeddings.
- [ ] Eliminar cualquier referencia a `aya-expanse:8b`.

### Tarea 2 — Actualizar `docs/design_docs/02-project-structure.md`
**Branch**: `task/HU-032-02-update-structure-doc`

- [ ] Actualizar versión de Angular en la tabla de stack.
- [ ] Actualizar el árbol de directorios: añadir `initial_data/`, `original_data/`, `scripts/`, `docs/diagrams/`, `docs/web/`, `docker-compose.consolidate.yml`, `docker-compose.seed.yml`, `LibreTranslateTranslationService.ts`.
- [ ] Actualizar la lista de historias de usuario a HU-001–HU-032.
- [ ] Eliminar referencia a `docs/db/books.json`.

### Tarea 3 — Actualizar `docs/design_docs/03-web-client-design.md`
**Branch**: `task/HU-032-03-update-webclient-doc`

- [ ] Reemplazar todas las referencias a Angular Material por Tailwind CSS.
- [ ] Actualizar la estructura de features: `catalog/` en lugar de `book-search/` + `book-detail/`.
- [ ] Actualizar la sección de theming y estilos para describir la configuración de Tailwind.
- [ ] Marcar la Fase 5 de Dockerización como completada.
- [ ] Eliminar todas las referencias a `mat-*` components.

### Tarea 4 — Actualizar `docs/design_docs/04-api-design.md`
**Branch**: `task/HU-032-04-update-api-design-doc`

- [ ] Corregir parámetro `typeId` → `type` en `GET /api/book-categories` y `GET /api/book-levels`.
- [ ] Corregir índice de BD: `ivfflat` → `HNSW`.
- [ ] Corregir esquema de relaciones: `type_id` FK directa → tabla de unión `type_levels`.
- [ ] Corregir `authors` max length: 200 → 300 chars.
- [ ] Actualizar `isbn` a `varchar(32)` y documentar como `BookIdentifier`.
- [ ] Actualizar comportamiento de `Book.validateAuthors()`: deduplicación silenciosa.
- [ ] Documentar el comportamiento de chunking en `OllamaEmbeddingService` (reemplaza `EmbeddingTextTooLongError`).
- [ ] Completar `format` enum con todos los valores.
- [ ] Añadir `LibreTranslateTranslationService` en la lista de adaptadores driven.

### Tarea 5 — Actualizar `docs/api/openapi.yaml` y `docs/db/init-db.sql`
**Branch**: `task/HU-032-05-update-openapi-and-db-schema`

- [ ] Actualizar descripción, validación y ejemplos de error del campo `isbn`/`bookIdentifier` en `openapi.yaml`.
- [ ] Actualizar errores 503 para mencionar ambos proveedores de traducción.
- [ ] Actualizar `docs/db/init-db.sql`: `VARCHAR(13)` → `VARCHAR(32)` en columna `isbn`.

### Tarea 6 — Integrar Swagger UI en la API
**Branch**: `task/HU-032-06-swagger-ui`

- [ ] Instalar `@fastify/swagger` y `@fastify/swagger-ui` en `apps/api`.
- [ ] Registrar los plugins en el servidor Fastify, apuntando a `docs/api/openapi.yaml`.
- [ ] Configurar la ruta `/docs` y restringirla a entornos `development` y `test`.
- [ ] Verificar que la UI carga correctamente en `http://localhost:3000/docs`.
- [ ] Verificar que no hay errores de compilación TypeScript (`npm run build`).

### Tarea 7 — Actualizar `README.md`
**Branch**: `task/HU-032-07-update-readme`

- [ ] Eliminar referencia a `docs/db/books.json`.
- [ ] Corregir sección de seed de producción para documentar `docker-compose.seed.yml`.
- [ ] Añadir sección **Swagger UI**: descripción, URL (`http://localhost:3000/docs`), disponibilidad solo en dev/test.
- [ ] Ampliar o crear sección de **instalación en producción** (VPS desde cero): requisitos previos, clonado del repo, configuración de variables de entorno, construcción de imágenes, migración de BD, seed inicial.
- [ ] Documentar todos los entornos disponibles: dev, prod, test, consolidate, seed, con sus comandos respectivos.
- [ ] Documentar los comandos de carga de libros, transformación de JSON y operaciones del catálogo.

---

## Definition of Done

- [ ] Todos los documentos de `docs/design_docs/` reflejan el estado real del sistema post HU-031.
- [ ] `docs/api/openapi.yaml` y `docs/db/init-db.sql` están sincronizados con la implementación.
- [ ] Swagger UI accesible en `http://localhost:3000/docs` en entorno de desarrollo.
- [ ] `README.md` es la referencia operativa completa del proyecto.
- [ ] 0 errores de lint, 0 errores de tipo, build exitoso.
- [ ] Commits realizados con el estándar Conventional Commits.

---

**Historia creada**: Viernes, 6 de Marzo, 2026  
**Estimación**: 8 horas  
**Prioridad**: Media-Alta  
**Complejidad**: Media (volumétrica)
