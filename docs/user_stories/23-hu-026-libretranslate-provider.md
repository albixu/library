# HU-026: Incorporación de LibreTranslate como Proveedor de Traducción Alternativo

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-026 |
| **Estado** | Pendiente |
| **Fecha** | 2026-03-02 |
| **Prioridad** | Alta |
| **Estimación** | 6 horas (~1 día) |

---

## 1. Historia de Usuario

**Como** administrador del sistema,  
**Quiero** poder elegir entre Ollama y LibreTranslate como proveedor de traducción mediante una variable de entorno,  
**Para** poder usar LibreTranslate en cargas masivas de datos (velocidad) y Ollama en cargas individuales (sin dependencia externa), manteniendo ambas implementaciones activas en el sistema.

---

## 2. Contexto y Motivación

### 2.1 El problema de origen

El sistema de traducción actual está implementado únicamente con **Ollama** (`OllamaTranslationService`), usando el modelo `llama3.2:1b` corriendo en CPU. Esta implementación fue suficiente para las historias de usuario previas (HU-013, HU-025), donde la traducción se realizaba libro a libro a través del endpoint `POST /api/books`.

Sin embargo, al necesitar pre-traducir el catálogo completo de libros para la carga inicial de datos — requisito necesario para que la búsqueda semántica funcione correctamente en español — el rendimiento de Ollama se reveló inviable.

### 2.2 Medición del problema

Durante la prueba realizada el **2 de marzo de 2026**, se ejecutó el script `consolidate-books.ts` con `llama3.2:1b` contra los datos reales:

| Métrica | Resultado |
|---------|-----------|
| Libros a procesar | 2.783 (primer fichero) |
| Concurrencia configurada | 3 |
| Velocidad observada | ~3 libros/minuto |
| ETA estimada (2.783 libros) | ~30 horas |
| ETA estimada (55.000 libros totales) | ~610 horas (~25 días) |
| Errores de timeout de Ollama | Aparecieron desde el batch 13 |

Con **55.000 libros** en el catálogo completo y una velocidad de 3 libros/minuto, el proceso tardaría semanas. No es viable.

### 2.3 Alternativas evaluadas

Se evaluaron las siguientes alternativas antes de tomar la decisión:

| Opción | Análisis | Decisión |
|--------|----------|----------|
| **GPU para Ollama** | Mejoraría x10-x20 la velocidad, pero el hardware disponible no tiene GPU dedicada | ❌ Descartada (limitación de hardware) |
| **Modelo más pequeño** | `llama3.2:1b` ya es el modelo más ligero de la familia con calidad aceptable | ❌ Descartada (no hay opción más pequeña viable) |
| **Traducción lazy (on-demand)** | Traduciría solo cuando el usuario accede a un libro; incompatible con la búsqueda semántica, que requiere embeddings generados a partir de la descripción traducida al español | ❌ Descartada (incompatible con requisito de búsqueda semántica) |
| **Traducción parcial** | Solo pre-traducir los libros más populares; el resto quedaría sin búsqueda semántica | ❌ Descartada (experiencia degradada) |
| **API externa de pago (DeepL)** | Calidad excelente, pero con 55.000 libros (~22M chars) requeriría ~$154/mes o varios meses en el tier gratuito | ❌ Descartada (coste o tiempo inaceptables) |
| **MyMemory API gratuita** | 50.000 chars/día; para 22M chars serían ~440 días | ❌ Descartada (tiempo inaceptable) |
| **LibreTranslate self-hosted** | Open source, sin límites, sin coste, desplegable en Docker | ✅ **Seleccionada** |

### 2.4 Benchmark de LibreTranslate

Se realizó un benchmark real el **2 de marzo de 2026** con LibreTranslate corriendo en Docker en el mismo hardware, traduciendo descripciones de libros representativas (150-200 chars):

| Concurrencia | Throughput | ETA 55.000 libros |
|---|---|---|
| 1 | 4.2 req/s | ~3.7 horas |
| **3** | **6.1 req/s** | **~2.5 horas** ✅ |
| 5 | 5.5 req/s | ~2.8 horas |
| 10 | 5.2 req/s | ~3.0 horas |
| 20 | 5.2 req/s | ~3.0 horas |

**Sweet spot**: concurrencia 3 (a partir de ahí el servidor se satura sin beneficio).  
**0 errores** en todos los tests. Calidad de traducción verificada manualmente: correcta.

**Conclusión**: LibreTranslate es ~120x más rápido que Ollama para el mismo volumen. 55.000 libros en ~2.5 horas es completamente viable.

### 2.5 Decisión de diseño: mantener ambos proveedores

La decisión no es reemplazar Ollama por LibreTranslate, sino **mantener ambos con selección por variable de entorno**. La razón:

- **LibreTranslate** → óptimo para **carga masiva** (consolidate-books, seed-database). Velocidad máxima, sin llamadas a LLM costosas.
- **Ollama** → óptimo para **traducción individual** en `POST /api/books`. No requiere levantar un contenedor extra en producción. El usuario añade un libro, se traduce en ~2-3 segundos, experiencia aceptable.

El patrón correcto es **Strategy**, que ya está implícito en la arquitectura hexagonal existente: el puerto `TranslationService` define el contrato, y la implementación concreta se inyecta en el bootstrap. Solo hay que añadir una segunda implementación y el mecanismo de selección.

---

## 3. Solución Técnica

### 3.1 Patrón Strategy sobre la arquitectura hexagonal existente

El puerto `TranslationService` ya existe en `src/application/ports/TranslationService.ts`. La arquitectura hexagonal garantiza que el dominio y los casos de uso no necesitan ningún cambio.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PORTS (Interfaces)                            │    │
│  │              <<interface>> TranslationService                   │    │
│  │         translateToSpanish(text, sourceLang): Promise           │    │
│  └───────────────────────────┬─────────────────────────────────────┘    │
└──────────────────────────────│──────────────────────────────────────────┘
                               │ implements
              ┌────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐         ┌───────────────────────────────┐
│  OllamaTranslationService│         │ LibreTranslateTranslationService│
│  (existente)             │         │ (nueva)                        │
│                          │         │                                │
│  Usa: llama3.2:1b        │         │  Usa: LibreTranslate REST API  │
│  Endpoint: Ollama API    │         │  Endpoint: POST /translate     │
│  Ideal: uso individual   │         │  Ideal: carga masiva           │
└─────────────────────────┘         └───────────────────────────────┘
              │                                   │
              └──────────────┬────────────────────┘
                             │ seleccionado por
                             ▼
              ┌──────────────────────────┐
              │  TRANSLATION_PROVIDER    │
              │  env var                 │
              │  'ollama' (default)      │
              │  'libretranslate'        │
              └──────────────────────────┘
```

### 3.2 Nueva variable de entorno

```bash
# Selecciona el proveedor de traducción
TRANSLATION_PROVIDER=ollama          # default - para uso en API
TRANSLATION_PROVIDER=libretranslate  # para carga masiva

# Configuración de LibreTranslate (solo aplica si TRANSLATION_PROVIDER=libretranslate)
LIBRETRANSLATE_URL=http://libretranslate:5000  # default
LIBRETRANSLATE_TIMEOUT_MS=10000               # default: 10 segundos
```

### 3.3 Nuevo adaptador: LibreTranslateTranslationService

```typescript
// src/infrastructure/driven/translation/LibreTranslateTranslationService.ts
class LibreTranslateTranslationService implements TranslationService {
  baseUrl: string;       // Default: http://libretranslate:5000
  timeoutMs: number;     // Default: 10000
  retries: number;       // Default: 3

  async translateToSpanish(text: string, sourceLanguage: string): Promise<TranslationResult>
}
```

**Características:**
- Llama a `POST /translate` con `{ q, source, target: 'es', format: 'text' }`
- Si ya está en español, devuelve el texto original sin llamar a la API
- Retry con backoff exponencial (igual que `OllamaTranslationService`)
- Mismos errores de dominio: `TranslationServiceUnavailableError`, `TranslationError`

### 3.4 Selección en el bootstrap

```typescript
// src/infrastructure/config/container.ts (o equivalente)
const provider = process.env.TRANSLATION_PROVIDER ?? 'ollama';

const translationService: TranslationService =
  provider === 'libretranslate'
    ? new LibreTranslateTranslationService({ ... })
    : new OllamaTranslationService({ ... });
```

### 3.5 Docker: nuevo compose para consolidación con LibreTranslate

Se actualizará `docker-compose.consolidate.yml` para añadir el servicio LibreTranslate y configurar `TRANSLATION_PROVIDER=libretranslate`:

```yaml
services:
  libretranslate:
    image: libretranslate/libretranslate:latest
    container_name: library-consolidate-libretranslate
    command: --load-only en,es   # Solo modelos necesarios, arranque rápido
    networks:
      - consolidate-network

  api:
    environment:
      - TRANSLATION_PROVIDER=libretranslate
      - LIBRETRANSLATE_URL=http://libretranslate:5000
    depends_on:
      - libretranslate
```

---

## 4. Criterios de Aceptación

### AC-1: Nueva implementación LibreTranslateTranslationService

- [ ] Existe `src/infrastructure/driven/translation/LibreTranslateTranslationService.ts` que implementa el puerto `TranslationService`.
- [ ] Llama a `POST {LIBRETRANSLATE_URL}/translate` con el body correcto (`q`, `source`, `target: 'es'`, `format: 'text'`).
- [ ] Si el idioma de origen es `'es'`, devuelve el texto original sin llamar a la API.
- [ ] Implementa retry con backoff exponencial (3 intentos, igual que `OllamaTranslationService`).
- [ ] Lanza `TranslationServiceUnavailableError` si el servicio no responde.
- [ ] Lanza `TranslationError` si la respuesta no contiene texto traducido.
- [ ] El timeout es configurable via `LIBRETRANSLATE_TIMEOUT_MS` (default: 10000ms).

### AC-2: Selección de proveedor por variable de entorno

- [ ] La variable de entorno `TRANSLATION_PROVIDER` acepta los valores `'ollama'` y `'libretranslate'`.
- [ ] El valor por defecto es `'ollama'` (comportamiento previo sin cambios).
- [ ] Al arrancar la aplicación, se inyecta la implementación correcta según `TRANSLATION_PROVIDER`.
- [ ] Si `TRANSLATION_PROVIDER` tiene un valor desconocido, la aplicación lanza un error descriptivo en el arranque.

### AC-3: OllamaTranslationService sin cambios funcionales

- [ ] El comportamiento de `OllamaTranslationService` es idéntico al anterior.
- [ ] Todos los tests existentes de `OllamaTranslationService` siguen en verde sin modificaciones.

### AC-4: docker-compose.consolidate.yml actualizado

- [ ] El fichero `docker-compose.consolidate.yml` incluye el servicio `libretranslate` con `--load-only en,es`.
- [ ] El servicio `api` tiene configurado `TRANSLATION_PROVIDER=libretranslate` y `LIBRETRANSLATE_URL=http://libretranslate:5000`.
- [ ] El servicio `api` depende del servicio `libretranslate`.
- [ ] El `docker-compose.consolidate.yml` incluye comentarios de uso actualizados.

### AC-5: Tests unitarios de LibreTranslateTranslationService

- [ ] Existen tests en `tests/unit/infrastructure/driven/translation/LibreTranslateTranslationService.test.ts`.
- [ ] Se testea: traducción exitosa, idioma ya en español (sin llamada HTTP), retry ante error, `TranslationServiceUnavailableError` tras agotar reintentos, `TranslationError` ante respuesta inválida.
- [ ] Cobertura ≥ 80%.

### AC-6: Tests de integración de LibreTranslateTranslationService

- [ ] Existen tests en `tests/integration/infrastructure/translation/LibreTranslateTranslationService.integration.test.ts`.
- [ ] Usan `it.skipIf` si LibreTranslate no está disponible (igual que los tests de Ollama).
- [ ] Verifican una traducción real de inglés a español contra un servidor LibreTranslate real.

### AC-7: Documentación actualizada

- [ ] `docs/design_docs/04-api-design.md` actualizado:
  - Sección 2.1 (Stack Tecnológico): añadir fila para LibreTranslate.
  - Sección 6.1 (Driven Adapters): añadir documentación de `LibreTranslateTranslationService`.
  - Sección 6.3 (Configuración): añadir `TRANSLATION_PROVIDER`, `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_TIMEOUT_MS`.
  - Sección 13 (Decisiones de Diseño): añadir decisión **13.6** explicando el contexto, las alternativas evaluadas y la elección del patrón Strategy con LibreTranslate.
  - Diagrama de arquitectura hexagonal (sección 2.2): actualizar el bloque de Driven Adapters para mostrar ambas implementaciones de traducción.

---

## 5. Tareas de Implementación

### Tarea 1: Implementar LibreTranslateTranslationService

**Estimación**: 2 horas  
**Branch**: `task/HU-026-01-libretranslate-service`

- [ ] Crear `src/infrastructure/driven/translation/LibreTranslateTranslationService.ts`.
- [ ] Añadir configuración en `src/infrastructure/config/env.ts`: `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_TIMEOUT_MS`.
- [ ] Crear tests unitarios en `tests/unit/infrastructure/driven/translation/LibreTranslateTranslationService.test.ts`.
- [ ] Crear tests de integración en `tests/integration/infrastructure/translation/LibreTranslateTranslationService.integration.test.ts` con `it.skipIf`.

### Tarea 2: Implementar selección de proveedor (Strategy)

**Estimación**: 1 hora  
**Branch**: `task/HU-026-02-translation-provider-strategy`

- [ ] Añadir `TRANSLATION_PROVIDER` a `src/infrastructure/config/env.ts` con validación Zod (`z.enum(['ollama', 'libretranslate']).default('ollama')`).
- [ ] Actualizar el bootstrap/container para inyectar la implementación correcta según `TRANSLATION_PROVIDER`.
- [ ] Verificar que todos los tests existentes (unit, integration, e2e) siguen en verde.

### Tarea 3: Actualizar docker-compose.consolidate.yml

**Estimación**: 30 minutos  
**Branch**: `task/HU-026-03-update-consolidate-compose`

- [ ] Añadir servicio `libretranslate` con imagen `libretranslate/libretranslate:latest` y flag `--load-only en,es`.
- [ ] Actualizar el servicio `api` con `TRANSLATION_PROVIDER=libretranslate` y `LIBRETRANSLATE_URL`.
- [ ] Actualizar comentarios de uso en la cabecera del fichero.
- [ ] Verificar manualmente que el compose levanta correctamente y que el script de consolidación puede traducir.

### Tarea 4: Actualizar documentación

**Estimación**: 1.5 horas  
**Branch**: `task/HU-026-04-update-docs`

- [ ] Actualizar `docs/design_docs/04-api-design.md`:
  - Stack tecnológico: añadir LibreTranslate.
  - Driven Adapters: documentar `LibreTranslateTranslationService`.
  - Configuración (`env.ts`): añadir las tres nuevas variables.
  - Diagrama de arquitectura (sección 2.2): actualizar bloque de traducción.
  - Decisiones de Diseño: añadir sección **13.6** con todo el contexto de esta HU.

---

## 6. Definition of Done

- [ ] `LibreTranslateTranslationService` implementado, con retry y mismos errores que `OllamaTranslationService`.
- [ ] `TRANSLATION_PROVIDER=ollama` mantiene el comportamiento anterior sin cambios.
- [ ] `TRANSLATION_PROVIDER=libretranslate` inyecta la nueva implementación correctamente.
- [ ] `docker-compose.consolidate.yml` usa LibreTranslate y arranca sin errores.
- [ ] Tests unitarios de `LibreTranslateTranslationService` con cobertura ≥ 80%.
- [ ] Tests de integración con `it.skipIf` si el servicio no está disponible.
- [ ] `docs/design_docs/04-api-design.md` actualizado con diagrama y sección 13.6.
- [ ] 0 errores de lint, 0 errores de tipo, todos los tests en verde.
- [ ] Commits realizados con el estándar Conventional Commits.

---

**Historia creada**: Lunes, 2 de Marzo, 2026  
**Estimación**: 5 horas (~1 día)  
**Prioridad**: Alta  
**Complejidad**: Baja-Media (el puerto ya existe, es añadir una implementación y el switch)
