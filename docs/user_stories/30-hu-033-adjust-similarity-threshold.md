# HU-033: Ajuste del Umbral de Similitud Semántica

## Descripción

**Como** usuario del sistema,  
**Quiero** que la búsqueda semántica de libros devuelva resultados relevantes aunque no sean idénticos al criterio de búsqueda,  
**Para** encontrar libros relacionados con mi consulta que con el umbral actual quedan excluidos incorrectamente.

---

## Contexto y motivación

La búsqueda semántica utiliza el modelo de embeddings `nomic-embed-text` (vía Ollama) para convertir textos en vectores y comparar su similitud coseno. El umbral actual está configurado en `0.7` — valor heredado de otros modelos como `text-embedding-ada-002` de OpenAI, que producen similitudes coseno más altas por su mayor dimensionalidad y entrenamiento.

### El problema con `nomic-embed-text` y un umbral de `0.7`

El modelo `nomic-embed-text` tiene características propias:
- Produce similitudes coseno **estructuralmente más bajas** que modelos como `ada-002`.
- Dos textos semánticamente relacionados pero no idénticos generan similitudes típicas de **0.55–0.65**.
- Con un umbral de `0.7`, estos resultados son **filtrados aunque sean legítimamente relevantes**.

### Impacto observado

Con el umbral en `0.7`, búsquedas semánticas válidas devuelven `[]` (array vacío) porque ningún resultado supera el filtro, a pesar de que la base de datos contiene libros claramente relacionados con la consulta.

### Calibración propuesta

El rango recomendado para `nomic-embed-text` es `0.50–0.60`. Se acuerda bajar el umbral a **`0.55`** como balance entre:
- **Precisión**: no incluir resultados irrelevantes.
- **Recall**: no excluir resultados legítimamente relacionados.

Este ajuste sigue el enfoque estándar de la industria de **calibrar el umbral por modelo**, frente a una constante genérica independiente del motor de embeddings.

---

## Criterios de Aceptación

### CA-1: Constante `SIMILARITY_THRESHOLD` actualizada
- El valor de `SIMILARITY_THRESHOLD` en `apps/api/src/domain/criteria/constants.ts` es `0.55`.
- El cambio no rompe ningún test existente.

### CA-2: Comentarios en código actualizados
- El comentario en `SearchBooksUseCase.ts` refleja `55%` (o `0.55`) en lugar de `70%`.
- Los comentarios en `PostgresBookRepository.ts` reflejan `55%` en lugar de `70%`.
- El comentario en `BookRepository.ts` (puerto) refleja `55%` en lugar de `70%`.

### CA-3: `docs/design_docs/04-api-design.md` actualizado
- Todas las referencias al umbral (`≥70%`, `0.70`) se actualizan a `≥55%` / `0.55`.
- Se añade una nota explicativa sobre la calibración por modelo (`nomic-embed-text`).

### CA-4: `docs/api/openapi.yaml` actualizado
- Todas las referencias al umbral (`≥70%`, `0.7 - 1.0`) se actualizan a `≥55%` / `0.55 - 1.0`.

### CA-5: Tests actualizados o verificados
- Los tests unitarios y de integración existentes siguen pasando con el nuevo umbral.
- Si algún test estaba fijado en `0.7`, se actualiza a `0.55`.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `docs/user_stories/30-hu-033-adjust-similarity-threshold.md` | Nuevo (este documento) |
| `apps/api/src/domain/criteria/constants.ts` | Cambio de valor: `0.7` → `0.55` |
| `apps/api/src/application/use-cases/SearchBooksUseCase.ts` | Actualización de comentario |
| `apps/api/src/infrastructure/driven/persistence/PostgresBookRepository.ts` | Actualización de comentarios |
| `apps/api/src/application/ports/BookRepository.ts` | Actualización de comentario |
| `docs/design_docs/04-api-design.md` | Actualización de umbral + nota de calibración |
| `docs/api/openapi.yaml` | Actualización de umbral |

---

## Tareas técnicas

### Tarea 1 — Actualizar constante y comentarios en código
**Branch**: `task/HU-033-01-update-threshold-constant`

- [ ] Cambiar `SIMILARITY_THRESHOLD: 0.7` → `SIMILARITY_THRESHOLD: 0.55` en `constants.ts`.
- [ ] Actualizar comentario en `SearchBooksUseCase.ts`: `70%` → `55%`.
- [ ] Actualizar comentarios en `PostgresBookRepository.ts`: `70%` → `55%` (dos ocurrencias).
- [ ] Actualizar comentario en `BookRepository.ts`: `70%` → `55%`.
- [ ] Ejecutar tests para verificar que no hay regresiones.

### Tarea 2 — Actualizar documentación
**Branch**: `task/HU-033-02-update-docs`

- [ ] Actualizar `docs/design_docs/04-api-design.md`: reemplazar las 3 referencias al umbral `0.70` / `≥70%` por `0.55` / `≥55%`, y añadir nota sobre calibración por modelo.
- [ ] Actualizar `docs/api/openapi.yaml`: reemplazar las referencias a `≥70%` y `0.7 - 1.0` por `≥55%` y `0.55 - 1.0`.

---

## Definition of Done

- [ ] `SIMILARITY_THRESHOLD` es `0.55` en el código.
- [ ] Todos los comentarios en código reflejan el nuevo valor.
- [ ] Documentación técnica (`04-api-design.md`, `openapi.yaml`) sincronizada con el nuevo umbral.
- [ ] 0 errores de lint, 0 errores de tipo, build exitoso.
- [ ] Todos los tests pasan (sin borrar ninguno).
- [ ] Commits realizados con el estándar Conventional Commits.

---

**Historia creada**: Viernes, 6 de Marzo, 2026  
**Estimación**: 1 hora  
**Prioridad**: Media  
**Complejidad**: Baja
