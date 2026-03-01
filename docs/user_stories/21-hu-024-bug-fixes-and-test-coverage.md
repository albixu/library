# HU-024: Corrección de Bugs y Cobertura de Tests

## Descripción

**Como** desarrollador del proyecto,  
**Quiero** corregir los bugs identificados en la auditoría técnica y cerrar los gaps de cobertura de tests,  
**Para** garantizar que el sistema se comporta correctamente en todos los casos de uso definidos y que los tests reflejan fielmente el comportamiento esperado.

## Contexto

Tras realizar una auditoría técnica exhaustiva cruzando la documentación (historias de usuario), la implementación y los tests, se identificaron 4 bugs reales, 3 gaps críticos de cobertura y 2 problemas de calidad en los tests. Esta historia agrupa todas las correcciones necesarias para alcanzar el estado de calidad definido en la Definition of Done del proyecto.

Los problemas identificados son:

- **BUG-001**: `TranslationServiceUnavailableError` devuelve HTTP 500 en lugar de 503 (viola HU-013 AC-05).
- **BUG-002**: `Book.create()` defaultea `available = false` en lugar de `true` (viola HU-001 AC-02).
- **BUG-003**: `FIELD_CONSTRAINTS.MAX_AUTHORS` en el dominio es 20 en lugar de 10 (viola HU-001 AC-06).
- **BUG-004**: `DuplicateBookError` se construye con argumentos incorrectos en los tests.
- **GAP-001**: 3 tests E2E permanentemente skipped (traducción + embedding 503) sin cobertura alternativa.
- **GAP-002**: `HttpErrorMapper` sin tests para `TranslationServiceUnavailableError` ni `TranslationError`.
- **GAP-003**: Tests de integración de traducción pasan silenciosamente sin ejecutarse cuando el modelo no está disponible.
- **ARCH-001**: Cursor de paginación usa `books.title` raw en lugar de `books.normalizedTitle`.
- **ARCH-003**: `BookAlreadyExistsError` marcada como deprecated pero sigue en el codebase (dead code).
- **ARCH-004**: Tests de retry de `OllamaTranslationService` usan timers reales en lugar de `vi.useFakeTimers()`.

## Documentación Relacionada

- **HU-001**: Registro de Libros — AC-02 (available default), AC-05 (embedding 503), AC-06 (MAX_AUTHORS)
- **HU-013**: Traducción de Descripciones — AC-05 (translation 503 → 503 HTTP)
- **HU-012**: Buscar Libros — cursor pagination

---

## Criterios de Aceptación

### AC-1: BUG-001 — `TranslationServiceUnavailableError` mapeado a HTTP 503

- [ ] `HttpErrorMapper.ts` incluye un caso explícito para `TranslationServiceUnavailableError` que devuelve HTTP 503.
- [ ] El test unitario de `HttpErrorMapper` verifica que `TranslationServiceUnavailableError` produce una respuesta 503.
- [ ] El comportamiento es consistente con `EmbeddingServiceUnavailableError → 503`.

### AC-2: BUG-002 — `Book.create()` defaultea `available = true`

- [ ] `Book.ts`: `props.available ?? false` cambiado a `props.available ?? true`.
- [ ] `schema.ts` (Drizzle): columna `available` con `default(true)`.
- [ ] Los tests unitarios de `Book.test.ts` reflejan el nuevo default correcto.

### AC-3: BUG-003 — `MAX_AUTHORS` alineado a 10 en todas las capas

- [ ] `Book.ts`: `FIELD_CONSTRAINTS.MAX_AUTHORS = 10`.
- [ ] Los tests unitarios de `Book.test.ts` validan el límite de 10 autores (no 20).

### AC-4: BUG-004 — `DuplicateBookError` construido con los 3 argumentos correctos en tests

- [ ] `HttpErrorMapper.test.ts`: `new DuplicateBookError(title, author, format)` con los 3 argumentos requeridos.
- [ ] El mensaje de error no contiene `undefined`.

### AC-5: GAP-001 — Tests E2E de traducción y 503 activados

- [ ] El test E2E `'should return 503 when translation service is unavailable'` está implementado y activo (no `it.skip`).
- [ ] El test E2E `'should return 503 when embedding service is unavailable'` está implementado y activo (no `it.skip`).
- [ ] El test E2E `'should translate English description to Spanish'` está implementado y activo (no `it.skip`).
- [ ] Los tests usan una estrategia adecuada para mockear/controlar los servicios externos en E2E.

### AC-6: GAP-002 — `HttpErrorMapper` cubre todos los errores de traducción

- [ ] Test unitario: `TranslationServiceUnavailableError` → 503.
- [ ] Test unitario: `TranslationError` → 400 (o el código definido).
- [ ] Test unitario: `InvalidLanguageCodeError` → 400 (explícito, no solo por el catch genérico).

### AC-7: GAP-003 — Tests de integración de traducción usan `it.skipIf` en lugar de guards silenciosos

- [ ] Los tests de `CreateBookUseCase.integration.test.ts` que dependen del modelo de traducción usan `it.skipIf(!modelAvailable, ...)` en lugar de `if (!modelAvailable) { return; }`.
- [ ] Un test skipped aparece como skipped en el output, no como passed.

### AC-8: ARCH-001 — Cursor de paginación usa `normalizedTitle`

- [ ] `PostgresBookRepository.ts`: la condición de cursor usa `books.normalizedTitle` en lugar de `books.title`.
- [ ] Test unitario actualizado para reflejar el cambio.

### AC-9: ARCH-003 — Eliminación de `BookAlreadyExistsError` deprecated

- [ ] `DomainErrors.ts`: `BookAlreadyExistsError` eliminada.
- [ ] Todas las referencias a `BookAlreadyExistsError` eliminadas del codebase.

### AC-10: ARCH-004 — Tests de retry de `OllamaTranslationService` usan `vi.useFakeTimers()`

- [ ] `OllamaTranslationService.test.ts`: los tests del bloque `retry behavior` usan `vi.useFakeTimers()` y `vi.runAllTimersAsync()`.
- [ ] Los tests de retry se ejecutan sin esperas reales (< 100ms cada uno).

---

## Tareas de Implementación

### Tarea 1: BUG-001 — Mapear `TranslationServiceUnavailableError` a HTTP 503

**Estimación**: 30 minutos  
**Branch**: `task/HU-024-01-translation-503-mapping`

- [ ] Añadir caso en `HttpErrorMapper.ts` para `TranslationServiceUnavailableError → 503`.
- [ ] Añadir test unitario en `HttpErrorMapper.test.ts`.

### Tarea 2: BUG-002 — Corregir default de `available` en dominio y DB

**Estimación**: 30 minutos  
**Branch**: `task/HU-024-02-available-default-fix`

- [ ] Corregir `Book.ts`: `props.available ?? true`.
- [ ] Corregir `schema.ts`: columna `available` con `default(true)`.
- [ ] Actualizar tests afectados en `Book.test.ts`.
- [ ] Generar y aplicar migración Drizzle si es necesario.

### Tarea 3: BUG-003 — Alinear `MAX_AUTHORS` a 10

**Estimación**: 30 minutos  
**Branch**: `task/HU-024-03-max-authors-align`

- [ ] Corregir `Book.ts`: `FIELD_CONSTRAINTS.MAX_AUTHORS = 10`.
- [ ] Actualizar tests en `Book.test.ts` que validan el límite de autores.

### Tarea 4: BUG-004 + GAP-002 + AC-6 — Fixes en tests + `HttpErrorMapper` completo

**Estimación**: 45 minutos  
**Branch**: `task/HU-024-04-error-mapper-and-test-fixes`

- [ ] Corregir `HttpErrorMapper.test.ts`: `DuplicateBookError` con 3 argumentos.
- [ ] Añadir test: `TranslationServiceUnavailableError → 503`.
- [ ] Añadir test: `TranslationError → 400`.
- [ ] Añadir test: `InvalidLanguageCodeError → 400`.
- [ ] Verificar que `DomainError` abstracto no se instancia directamente en tests.

### Tarea 5: GAP-001 — Activar tests E2E de traducción y 503

**Estimación**: 1.5 horas  
**Branch**: `task/HU-024-05-e2e-translation-tests`

- [ ] Analizar estrategia viable para los 3 tests E2E skipped.
- [ ] Implementar y activar `'should return 503 when translation service is unavailable'`.
- [ ] Implementar y activar `'should return 503 when embedding service is unavailable'`.
- [ ] Implementar y activar `'should translate English description to Spanish'`.

### Tarea 6: GAP-003 — Usar `it.skipIf` en tests de integración

**Estimación**: 20 minutos  
**Branch**: `task/HU-024-06-skipif-integration-tests`

- [ ] Refactorizar `CreateBookUseCase.integration.test.ts`: sustituir guards silenciosos por `it.skipIf(...)`.
- [ ] Verificar que los tests skipped aparecen como skipped en el output de Vitest.

### Tarea 7: ARCH-001 — Cursor pagination con `normalizedTitle`

**Estimación**: 30 minutos  
**Branch**: `task/HU-024-07-cursor-normalized-title`

- [ ] Corregir `PostgresBookRepository.ts`: cursor usa `books.normalizedTitle`.
- [ ] Actualizar test unitario de `PostgresBookRepository.test.ts`.

### Tarea 8: ARCH-003 + ARCH-004 — Dead code y fake timers

**Estimación**: 30 minutos  
**Branch**: `task/HU-024-08-cleanup-dead-code-fake-timers`

- [ ] Eliminar `BookAlreadyExistsError` de `DomainErrors.ts` y todas sus referencias.
- [ ] Añadir `vi.useFakeTimers()` / `vi.useRealTimers()` en el bloque `retry behavior` de `OllamaTranslationService.test.ts`.

---

## Definition of Done

- ✅ Todos los bugs listados corregidos con su test correspondiente.
- ✅ 0 tests `it.skip` sin justificación técnica documentada.
- ✅ `HttpErrorMapper` cubre el 100% de los errores del mapa.
- ✅ Tests de integración de traducción usan `it.skipIf` (skip explícito, no silencioso).
- ✅ `BookAlreadyExistsError` eliminada del codebase.
- ✅ Tests de retry de `OllamaTranslationService` usan fake timers.
- ✅ 0 errores de lint, 0 errores de tipo, todos los tests en verde.
- ✅ Commits realizados con el estándar Conventional Commits.

---

**Historia creada**: Domingo, 1 de Marzo, 2026  
**Estimación**: 5 horas  
**Prioridad**: Alta  
**Complejidad**: Media
