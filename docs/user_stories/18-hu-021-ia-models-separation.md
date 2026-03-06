# HU-021: Optimización de Consolidación y Separación de Modelos de IA

## Descripción

**Como** administrador del sistema,  
**Quiero** optimizar el script de consolidación de libros y separar los servicios de IA en contenedores independientes,  
**Para** mejorar la eficiencia en el uso de memoria RAM, usar un modelo más óptimo para las traducciones (`llama3.2:1b`) y arreglar la lógica de deduplicación de ISBNs basándola en los ficheros de origen y no en la base de datos.
  
## Contexto

Actualmente, el proceso de consolidar los archivos original data (`consolidate-books.ts`) usa la base de datos para ignorar los ISBNs que ya existen. La lógica de negocio establece que el propósito de este script solo debe ser parsear y enviar estos ficheros a `docs/db/initial_data/`, debiendo ignorar los libros repetidos en las sucesivas lecturas de los ficheros de origen, **sin apoyarse en la base de datos**.

Continuando con las mejoras, el servidor actualmente carga un único contenedor de **Ollama** con tanto el modelo de traducciones (`qwen2.5:1.5b`) como de embeddings (`nomic-embed-text`). El proceso de `consolidate` solo necesita traducciones, y el `seed` / búsqueda online solo necesita embeddings. Separarlos en **dos contenedores distintos** y cambiar el modelo de traducción por `llama3.2:1b` (más óptimo localmente) aligerará muchísimo la carga de la máquina y hará más escalable el sistema.

## Documentación Relacionada

- **Afectación**: `apps/api/scripts/consolidate-books.ts`
- **Design Docs de Arquitectura actuales**: `01-project-overview.md`, `04-api-design.md`
- **Ficheros de Configuración**: Todos los ficheros `.yml` de orquestación local y producción de Docker.

---

## Criterios de Aceptación

### AC-1: Modificaciones al script `consolidate-books.ts`

- [ ] La deduplicación de ISBNs solo se realiza en base a los ficheros leídos desde `original_data` en tiempo de ejecución (manteniendo la primera ocurrencia de cada ISBN, en orden alfabético de archivos).
- [ ] Se remueve por completo la conexión y dependencia con la base de datos (`DATABASE_URL`, Drizzle, `getExistingIsbns()`).
- [ ] Se remueven e ignoran las variables de entorno inútiles relacionadas con DB en el array de validación `env` (si lo hubiera).
- [ ] Mantenimiento y cobertura en verde de los tests funcionales asociados a la lógica del script.

### AC-2: Optimización de recursos en Docker de Consolidación

- [ ] El archivo `docker-compose.consolidate.yml` no levantará el servicio `postgres` (ni su volumen o network dependiente).
- [ ] El contenedor de Ollama para este compose se actualizará para usar el contenedor respectivo dedicado a traducciones (`ollama-translations`) mediante el nuevo modelo `llama3.2:1b`.
- [ ] Se actualizará la variable de entorno `TRANSLATION_MODEL` en las dependencias de este compose.

### AC-3: Separación de contenedores Ollama

- [ ] Múltiples entornos (`docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.test.yml`, `docker-compose.seed.yml`) instanciarán **dos contenedores independientes de Ollama**:
  - `ollama-embeddings`: Servicio de Ollama exclusivo con `nomic-embed-text`.
  - `ollama-translations`: Servicio de Ollama exclusivo con `llama3.2:1b`.
- [ ] En las inyecciones de puertos de la aplicación (`src/infrastructure/config/env.ts` o similaes), el backend deberá pedir dos URLs, p. ej. `OLLAMA_EMBEDDING_URL` y `OLLAMA_TRANSLATION_URL`.
- [ ] Actualizar el script global `scripts/setup-ollama-models.sh` para hacer push/pull automático y correcto de los dos modelos en sus containers dependientes.

### AC-4: Documentación

- [ ] Actualizar el texto fundacional de `README.md` borrando referencias al modelo global `qwen2.5:1.5b` e integrando explícitamente el uso de the `llama3.2:1b`.
- [ ] Actualizar `docs/design_docs/01-project-overview.md` y `04-api-design.md` ajustando la definición del Diagrama de Componentes que muestra dos cajas de Ollama separadas y detalla el cambio de LLM.
- [ ] Queda explícitamente prohibido alterar documentos pre-existentes localizados en `docs/user_stories/` previos al `18-`.

---

## Tareas de Implementación

### Tarea 1: Refactorizar script e in-memory deduplication de ISBNs

**Estimación**: 3 horas  
**Branch**: `task/HU-021-refactor-consolidate`

- [ ] Borrar imports de database, drizzle y `pg` de `consolidate-books.ts`.
- [ ] Modificar iteración para llevar record "in-memory" (usando un `Set` o map) de isbns vistos a lo largo de TODOS los archivos y desechar los solapados de manera consistente y sin DB queries.
- [ ] Configurar inyección simple a Ollama (solo usar model Translator provider).

### Tarea 2: Asegurar y actualizar Unit Tests

**Estimación**: 3 horas  
**Branch**: `task/HU-021-testing-update-consolidate`

- [ ] Actualizar archivo `consolidate-books.test.ts` que simula la función `getExistingIsbns()`.
- [ ] Asegurar suite vitest > 80% e integridad de los flujos de fallo.

### Tarea 3: Modificar orquestadores `.yml`

**Estimación**: 3 horas  
**Branch**: `task/HU-021-update-docker-orchestration`

- [ ] Editar `docker-compose.consolidate.yml` restando y purgando el postgres.
- [ ] Editar `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.test.yml` y `docker-compose.seed.yml`.
- [ ] Crear la estructura dual `ollama-embeddings` y `ollama-translations` administrando memory limits y variables.

### Tarea 4: Proveer configuración de Inversión de Control y variables

**Estimación**: 2 horas  
**Branch**: `task/HU-021-env-variables-refactor`

- [ ] Expandir el wrapper environment de Fastify / Typescript para que ingiera `OLLAMA_EMBEDDING_URL` y `OLLAMA_TRANSLATION_URL`.
- [ ] Propagar a los services `EmbeddingService` y `TranslationService`.

### Tarea 5: Actualizar Bash de setup

**Estimación**: 1 hora  
**Branch**: `task/HU-021-sh-setup`

- [ ] Actualizar `scripts/setup-ollama-models.sh`

### Tarea 6: Actualizar Documentación

**Estimación**: 2 horas  
**Branch**: `task/HU-021-documentation-update`

- [ ] `README.md`
- [ ] `01-project-overview.md`
- [ ] `04-api-design.md`

## Definition of Done

- ✅ Deduplicación local funcional, postgres ignorado.
- ✅ Docker levanta dos modelos de Ollama de forma satisfactoria, o aísla según necesite cada flujo.
- ✅ El código fuente utiliza los servicios con doble URL enmascarando cualquier pathing default.
- ✅ Los tests de pipeline general pasan.

---

**Historia creada**: Martes, 1 de Marzo, 2026  
**Estimación**: 14 horas (~2 días)  
**Prioridad**: Alta  
**Complejidad**: Media
