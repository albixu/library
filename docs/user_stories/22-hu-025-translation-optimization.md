# HU-025: Optimización del Pipeline de Traducción en consolidate-books

## Descripción

**Como** administrador del sistema,  
**Quiero** que el script `consolidate-books.ts` traduzca las descripciones de los libros de forma eficiente mediante procesamiento en paralelo (batches) y un sistema de caché persistente,  
**Para** eliminar los timeouts y los tiempos de ejecución inviables, permitiendo que el proceso de consolidación sea robusto, reanudable y sostenible con grandes volúmenes de datos.

## Contexto

El script `consolidate-books.ts` actualmente traduce las descripciones de los libros de forma **estrictamente secuencial**: espera a que cada llamada a Ollama termine antes de iniciar la siguiente. Con el modelo `llama3.2:1b` corriendo localmente, cada traducción puede tardar entre 3 y 10 segundos, lo que convierte el procesamiento de cientos o miles de libros en una operación de horas con alta probabilidad de timeout y sin posibilidad de reanudar desde el punto de fallo.

Además, se han detectado **referencias al modelo obsoleto `qwen2.5:3b`** en tests y documentación que deben corregirse para que el proyecto sea coherente con la realidad del sistema.

Los dos problemas a resolver son:

- **PERF-001**: Procesamiento secuencial de traducciones → demasiado lento e inviable.
- **DOC-001**: Referencias obsoletas a `qwen2.5:3b` en tests y documentación técnica.

---

## Criterios de Aceptación

### AC-1: Sistema de caché persistente de traducciones

- [ ] Existe un fichero de caché (JSON) en una ruta configurable (default: `original_data/.translation-cache.json`).
- [ ] El caché almacena las traducciones indexadas por un hash determinista del texto original (ej. SHA-256).
- [ ] Antes de llamar a Ollama, el script consulta el caché. Si hay hit, usa la traducción cacheada directamente (0 llamadas a Ollama).
- [ ] Tras cada traducción exitosa, el resultado se persiste inmediatamente en el caché (tolerancia a fallos: si el proceso muere, el progreso no se pierde).
- [ ] El caché es agnóstico al nombre del libro o ISBN — solo depende del contenido del texto — por lo que funciona correctamente si el mismo texto aparece en múltiples libros.
- [ ] Las descripciones en español (`language === 'es'`) nunca se añaden al caché ni generan llamadas a Ollama.

### AC-2: Procesamiento en paralelo por batches

- [ ] Las traducciones se procesan en batches concurrentes con un tamaño configurable via variable de entorno `TRANSLATION_CONCURRENCY` (default: `3`).
- [ ] Dentro de cada batch, todas las traducciones se lanzan simultáneamente con `Promise.allSettled`.
- [ ] Un fallo en una traducción dentro del batch no cancela las demás del mismo batch.
- [ ] El progreso (porcentaje, ETA, hits de caché vs. llamadas reales) se muestra por consola al finalizar cada batch.
- [ ] El resultado de `ConsolidationResult` incluye los nuevos campos: `cacheHits`, `cacheMisses` y `concurrency`.

### AC-3: Persistencia del caché ante fallos

- [ ] Si el proceso es interrumpido (SIGINT, error inesperado, timeout), las traducciones ya completadas y guardadas en el caché se conservan.
- [ ] Al relanzar el script, las entradas ya cacheadas se usan directamente, sin rellamar a Ollama.
- [ ] Si el fichero de caché está corrupto o no existe, el script arranca limpio sin error (lo crea nuevo).

### AC-4: Corrección de referencias obsoletas al modelo `qwen2.5:3b`

- [ ] `tests/integration/application/use-cases/CreateBookUseCase.integration.test.ts`: todas las referencias a `qwen2.5:3b` sustituidas por `llama3.2:1b`.
- [ ] `tests/integration/scripts/consolidate-books.integration.test.ts`: todas las referencias a `qwen2.5:3b` sustituidas por `llama3.2:1b`.
- [ ] `tests/e2e/http/createBook.e2e.test.ts`: todas las referencias a `qwen2.5:3b` sustituidas por `llama3.2:1b`.
- [ ] `tests/unit/application/use-cases/CreateBookUseCase.test.ts`: referencias a `qwen2.5:3b` sustituidas por `llama3.2:1b`.
- [ ] `tests/unit/infrastructure/driven/translation/OllamaTranslationService.test.ts`: referencias a `qwen2.5:3b` sustituidas por `llama3.2:1b`.
- [ ] `docs/design_docs/04-api-design.md`: referencias a `qwen2.5:3b` y `qwen2.5:1.5b` actualizadas a `llama3.2:1b`.

### AC-5: Tests actualizados y en verde

- [ ] Los tests unitarios de `consolidate-books.test.ts` cubren los nuevos flujos: hit de caché, miss de caché, procesamiento en batch, fallo parcial dentro de un batch.
- [ ] Los tests de integración de `consolidate-books.integration.test.ts` verifican que el caché se escribe y se lee correctamente en un entorno real.
- [ ] Todos los tests existentes pasan sin modificar su lógica de negocio.
- [ ] Cobertura mínima del 80% en los nuevos módulos introducidos.

---

## Tareas de Implementación

### Tarea 1: Corrección de referencias obsoletas al modelo

**Estimación**: 30 minutos  
**Branch**: `task/HU-025-01-fix-model-references`

- [ ] Sustituir todas las referencias a `qwen2.5:3b` y `qwen2.5:1.5b` por `llama3.2:1b` en los ficheros de tests listados en AC-4.
- [ ] Actualizar `docs/design_docs/04-api-design.md` (líneas con `qwen2.5:3b` y `qwen2.5:1.5b`).
- [ ] Verificar que los tests unitarios e integración afectados siguen en verde.

### Tarea 2: Implementar el módulo de caché de traducciones

**Estimación**: 2 horas  
**Branch**: `task/HU-025-02-translation-cache`

- [ ] Crear `apps/api/scripts/translation-cache.ts` con la lógica de caché:
  - `loadCache(path)`: lee el fichero JSON o devuelve un objeto vacío si no existe o está corrupto.
  - `saveCache(path, cache)`: escribe el caché de forma atómica (write-then-rename para evitar corrupción).
  - `getCacheKey(text)`: genera un hash SHA-256 del texto original.
  - `get(cache, key)`: devuelve la traducción cacheada o `undefined`.
  - `set(cache, key, translation)`: añade/actualiza una entrada.
- [ ] El módulo es puro (sin side effects en importación) y 100% testeable en unit.
- [ ] Añadir tests unitarios en `tests/unit/scripts/translation-cache.test.ts`.

### Tarea 3: Integrar caché y batches en `consolidate-books.ts`

**Estimación**: 3 horas  
**Branch**: `task/HU-025-03-batch-processing`

- [ ] Añadir variable de entorno `TRANSLATION_CONCURRENCY` (default: `3`) leída en la configuración del script.
- [ ] Añadir variable de entorno `TRANSLATION_CACHE_PATH` (default: `<SOURCE_DIR>/.translation-cache.json`).
- [ ] Refactorizar la Fase 2 del script para:
  1. Cargar el caché al inicio de la fase.
  2. Separar los libros en: **ya en caché** (no necesitan Ollama) y **pendientes de traducir**.
  3. Procesar los pendientes en batches de `TRANSLATION_CONCURRENCY` con `Promise.allSettled`.
  4. Tras cada batch, persistir el caché actualizado.
- [ ] Actualizar el log de progreso para mostrar: `[X%] Batch Y/Z | Cache hits: N | Translated: M | Errors: E | ETA: ...`.
- [ ] Actualizar `ConsolidationResult` añadiendo: `cacheHits`, `cacheMisses`, `concurrency`.
- [ ] Actualizar el resumen final de consola con los nuevos campos.

### Tarea 4: Actualizar tests del script

**Estimación**: 2.5 horas  
**Branch**: `task/HU-025-04-update-tests`

- [ ] Actualizar `tests/unit/scripts/consolidate-books.test.ts`:
  - Añadir tests para el flujo con cache hit (no llama al translation service).
  - Añadir tests para el flujo batch: verifica que `Promise.allSettled` se invoca con el tamaño correcto.
  - Añadir test de fallo parcial en batch: un libro falla, el resto se procesan correctamente.
  - Verificar que `ConsolidationResult` incluye `cacheHits` y `cacheMisses`.
- [ ] Actualizar `tests/integration/scripts/consolidate-books.integration.test.ts`:
  - Añadir test que ejecuta el script dos veces y verifica que la segunda ejecución no llama a Ollama (todo desde caché).
  - Limpiar el fichero de caché en `afterEach` para no contaminar entre tests.

---

## Definition of Done

- ✅ Referencias obsoletas a `qwen2.5:3b` eliminadas de tests y documentación.
- ✅ El módulo `translation-cache.ts` existe, es puro y tiene cobertura ≥ 80%.
- ✅ `consolidate-books.ts` procesa traducciones en batches paralelos configurables.
- ✅ El caché se persiste tras cada batch y sobrevive a reinicios del proceso.
- ✅ Una segunda ejecución del script (mismos datos) no genera ninguna llamada a Ollama.
- ✅ `ConsolidationResult` expone `cacheHits`, `cacheMisses` y `concurrency`.
- ✅ 0 errores de lint, 0 errores de tipo, todos los tests en verde.
- ✅ Commits realizados con el estándar Conventional Commits.

---

**Historia creada**: Lunes, 2 de Marzo, 2026  
**Estimación**: 8 horas (~1 día)  
**Prioridad**: Alta  
**Complejidad**: Media
