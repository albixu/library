# HU-028: Aumentar el límite máximo de descripción a 25.000 caracteres

## Metadata

| Campo         | Valor                                              |
|---------------|----------------------------------------------------|
| **ID**        | HU-028                                             |
| **Título**    | Aumentar el límite máximo de descripción a 25.000 caracteres |
| **Épica**     | Gestión de catálogo y calidad de datos             |
| **Prioridad** | Alta                                               |
| **Estado**    | Pendiente                                          |

---

## Contexto y motivación

Durante la ejecución del script de consolidación del catálogo (`HU-027`), se detectaron **libros cuyas descripciones superan los 10.000 caracteres** actualmente permitidos:

- Libro con descripción de **11.909 caracteres**
- Libro con descripción de **19.160 caracteres**
- Libro con descripción de **10.736 caracteres**

En todos los casos, el servicio de traducción (LibreTranslate / Ollama) lanza un `TranslationError` tras agotar los 3 reintentos, registrando el error:

```
Translation failed after 3 attempts: Text too long for translation: X characters (max 10000)
```

Esto provoca que dichos libros queden **sin traducción** en el proceso de consolidación, degradando la calidad del catálogo final.

### Por qué 25.000 y no otro valor

El límite anterior de 10.000 se estableció en `HU-027` como una mejora respecto al original de 5.000, basándose en los datos disponibles en ese momento. Los datos reales del catálogo revelan descripciones que llegan hasta ~20.000 caracteres. Se elige **25.000** como valor que:

1. Cubre con margen todos los casos reales observados (el mayor es ~19.160).
2. Es coherente con PostgreSQL `TEXT` (sin límite de columna), por lo que no requiere cambios de esquema de BD.
3. Es asumible para los servicios de traducción si se implementa chunking (ver HU futura).

> **Nota:** La base de datos (`schema.ts`, `init-db.sql`) ya usa `TEXT` sin límite desde `HU-027`, por lo que **no se requiere ninguna migración de BD**.

---

## Historia de usuario

**Como** administrador del sistema,  
**quiero** que el sistema acepte y procese descripciones de libros de hasta 25.000 caracteres,  
**para** que ningún libro del catálogo quede excluido del proceso de consolidación y traducción por tener una descripción larga.

---

## Criterios de aceptación

| ID    | Criterio |
|-------|----------|
| AC-01 | La entidad `Book` acepta descripciones de hasta 25.000 caracteres sin lanzar `FieldTooLongError`. |
| AC-02 | El schema Zod HTTP rechaza descripciones superiores a 25.000 caracteres con el mensaje de error correcto. |
| AC-03 | Los servicios de traducción (`OllamaTranslationService`, `LibreTranslateTranslationService`) aceptan textos de hasta 25.000 caracteres sin lanzar `TranslationError` por longitud. |
| AC-04 | Todos los tests unitarios e de integración afectados pasan con el nuevo límite. |
| AC-05 | La documentación OpenAPI refleja `maxLength: 25000`. |
| AC-06 | Los documentos de diseño y diagramas muestran el límite actualizado. |
| AC-07 | El `MAX_EMBEDDING_TEXT_LENGTH` en `CreateBookUseCase` se revisa y ajusta si es necesario para mantener coherencia. |

---

## Archivos afectados

| Capa | Archivo | Cambio |
|------|---------|--------|
| Dominio | `apps/api/src/domain/entities/Book.ts` | `DESCRIPTION_MAX_LENGTH: 10000 → 25000` |
| HTTP Schema | `apps/api/src/infrastructure/driver/http/schemas/book.schemas.ts` | `.max(10000) → .max(25000)` |
| Traducción | `apps/api/src/infrastructure/driven/translation/OllamaTranslationService.ts` | `MAX_TEXT_LENGTH: 10000 → 25000` + fix JSDoc |
| Traducción | `apps/api/src/infrastructure/driven/translation/LibreTranslateTranslationService.ts` | `MAX_TEXT_LENGTH: 10000 → 25000` + fix JSDoc |
| Puerto | `apps/api/src/application/ports/TranslationService.ts` | Fix JSDoc `@param` |
| Caso de uso | `apps/api/src/application/use-cases/CreateBookUseCase.ts` | Revisar `MAX_EMBEDDING_TEXT_LENGTH` y comentarios |
| Tests unitarios | `apps/api/tests/unit/domain/entities/Book.test.ts` | Actualizar tests de límite 10000 → 25000 |
| Tests unitarios | `apps/api/tests/unit/infrastructure/driven/translation/OllamaTranslationService.test.ts` | Actualizar tests de límite |
| Tests unitarios | `apps/api/tests/unit/infrastructure/driven/translation/LibreTranslateTranslationService.test.ts` | Actualizar tests de límite |
| Tests integración | `apps/api/tests/integration/infrastructure/translation/OllamaTranslationService.integration.test.ts` | Actualizar tests de límite |
| Tests integración | `apps/api/tests/integration/infrastructure/translation/LibreTranslateTranslationService.integration.test.ts` | Actualizar tests de límite |
| OpenAPI | `docs/api/openapi.yaml` | `maxLength: 5000 → 25000` en request schema |
| Diseño | `docs/design_docs/01-project-overview.md` | Actualizar tablas de campos |
| Diseño | `docs/design_docs/04-api-design.md` | Actualizar límite en tabla y ejemplo Zod |
| Diagrama | `docs/diagrams/04-book-creation-flow.md` | Actualizar referencia a límite de traducción |

> **No se requieren cambios de BD** (schema Drizzle y `init-db.sql` ya usan `TEXT`).

---

## Tareas técnicas

### TASK-01: Actualizar lógica de dominio y validaciones
- `Book.ts`: `DESCRIPTION_MAX_LENGTH: 10000 → 25000`
- `book.schemas.ts`: `.max(10000) → .max(25000)` con mensaje actualizado
- `OllamaTranslationService.ts`: `MAX_TEXT_LENGTH: 10000 → 25000` + corregir JSDoc (dice 5000)
- `LibreTranslateTranslationService.ts`: `MAX_TEXT_LENGTH: 10000 → 25000` + corregir JSDoc (dice 5000)
- `TranslationService.ts`: corregir JSDoc `@param` (dice 5000)
- `CreateBookUseCase.ts`: corregir comentario obsoleto (dice 5000) y revisar `MAX_EMBEDDING_TEXT_LENGTH`

### TASK-02: Actualizar tests
- `Book.test.ts`: actualizar tests del límite de descripción a 25000
- `OllamaTranslationService.test.ts`: actualizar tests de límite a 25000
- `LibreTranslateTranslationService.test.ts`: actualizar tests de límite a 25000
- `OllamaTranslationService.integration.test.ts`: actualizar tests de límite a 25000
- `LibreTranslateTranslationService.integration.test.ts`: actualizar tests de límite a 25000

### TASK-03: Actualizar documentación
- `docs/api/openapi.yaml`: `maxLength: 5000 → 25000`
- `docs/design_docs/01-project-overview.md`: actualizar tablas de campos
- `docs/design_docs/04-api-design.md`: actualizar límite y ejemplo Zod
- `docs/diagrams/04-book-creation-flow.md`: actualizar referencia al límite de traducción

---

## Notas técnicas

- **Sin migración de BD**: `description` y `original_description` ya son `TEXT` en PostgreSQL, que no tiene límite de longitud. El único cambio de BD necesario fue el de `HU-027` (VARCHAR → TEXT).
- **Embedding text**: `CreateBookUseCase` tiene un `MAX_EMBEDDING_TEXT_LENGTH = 7000` para el texto que se envía al modelo de embeddings. Este límite es independiente del campo description y puede mantenerse con truncado implícito del texto de embedding, sin afectar al contenido almacenado. Se revisará si necesita ajuste.
- **Chunking de traducción**: Para textos superiores a la capacidad de LibreTranslate se contemplará en una HU futura. En esta HU solo se amplía el límite de validación, que es la causa raíz de los errores observados.
