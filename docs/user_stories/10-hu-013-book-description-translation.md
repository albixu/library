# Design Doc: HU-013 - Traducción de Descripciones de Libros al Español

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-013 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-22 |
| **Prioridad** | Media |
| **Estimación** | A definir |

---

## 1. Historia de Usuario

**Como** administrador del sistema,  
**Quiero** que las descripciones de los libros se almacenen en su idioma original y también traducidas al español,  
**Para** poder generar embeddings consistentes en español que mejoren la búsqueda semántica en el idioma principal de la aplicación.

---

## 2. Descripción Funcional

### 2.1 Contexto

Actualmente, la entidad `Book` tiene un único campo `description` que almacena la descripción del libro en su idioma original. Los embeddings se generan a partir de este campo, lo que resulta en embeddings multilingües que dificultan la búsqueda semántica en español.

### 2.2 Cambios Propuestos

1. **Nuevo campo `original_description`**: Almacenará la descripción en el idioma original del libro
2. **Campo `description` redefinido**: Contendrá SIEMPRE la descripción en español
3. **Servicio de traducción**: Nuevo servicio que traduce descripciones de otros idiomas al español
4. **Embeddings en español**: Se generarán a partir del campo `description` (siempre en español)

### 2.3 Flujo de Creación de Libro

```
┌─────────────────────────────────────────────────────────────────────┐
│ ENTRADA: description del libro + language (ISO 639-1)              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ALMACENAR DESCRIPCIÓN ORIGINAL                                   │
│    original_description = description (entrada)                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────┴─────────────┐
                    │   ¿language === 'es'?     │
                    └─────────────┬─────────────┘
                          │               │
                         SÍ              NO
                          │               │
                          ▼               ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│ description =               │   │ 2. TRADUCIR AL ESPAÑOL          │
│   original_description      │   │    TranslationService.translate │
│ (copia directa)             │   │    (original_description, 'es') │
└─────────────────────────────┘   └─────────────────────────────────┘
                          │               │
                          └───────┬───────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. GENERAR EMBEDDING                                                │
│    EmbeddingService.generateEmbedding(description)                  │
│    (Ahora SIEMPRE en español)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Criterios de Aceptación

### 3.1 Almacenamiento de Descripciones

| ID | Criterio |
|----|----------|
| AC-01 | La tabla `books` tiene una nueva columna `original_description` (VARCHAR 5000, NOT NULL) |
| AC-02 | El campo `description` contiene SIEMPRE texto en español |
| AC-03 | El campo `original_description` contiene la descripción en el idioma original |
| AC-04 | El campo `language` indica el idioma original del libro (ISO 639-1) |

### 3.2 Traducción

| ID | Criterio |
|----|----------|
| AC-05 | Si `language = 'es'`, `description` = `original_description` (sin traducción) |
| AC-06 | Si `language ≠ 'es'`, `description` = traducción de `original_description` al español |
| AC-07 | La traducción es estricta: no se pierde ni se añade información |
| AC-08 | Si la traducción falla, se devuelve error y NO se crea el libro |

### 3.3 Embeddings

| ID | Criterio |
|----|----------|
| AC-09 | Los embeddings se generan a partir del campo `description` (español) |
| AC-10 | El método `getTextForEmbedding()` usa `description` (no `original_description`) |

### 3.4 Script consolidate-books.ts

| ID | Criterio |
|----|----------|
| AC-11 | Solo sobrescribe `type` si NO viene en los datos originales del JSON |
| AC-12 | Solo sobrescribe `format` si NO viene en los datos originales del JSON |
| AC-13 | Si `type` existe en el JSON de entrada, se mantiene el valor original |
| AC-14 | Si `format` existe en el JSON de entrada, se mantiene el valor original |

---

## 4. Modelo de Datos

### 4.1 Cambios en Entidad Book

```typescript
interface Book {
  id: UUID;
  isbn: ISBN | null;
  title: string;
  authors: Author[];
  originalDescription: string;   // NUEVO: descripción en idioma original
  description: string;           // MODIFICADO: ahora SIEMPRE en español
  language: string;              // ISO 639-1 (ej: 'es', 'en', 'fr')
  type: BookType;
  categories: Category[];
  format: BookFormat;
  levelId: string | null;
  available: boolean;
  path: string | null;
  embedding: number[];           // Generado desde description (español)
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 Cambios en CreateBookProps

```typescript
interface CreateBookProps {
  id: string;
  title: string;
  authors: Author[];
  type: BookType;
  categories: Category[];
  format: string;
  description: string;           // Se guardará en original_description
  language: string;              // ISO 639-1, obligatorio
  isbn?: string | null;
  levelId?: string | null;
  available?: boolean;
  path?: string | null;
}
```

### 4.3 Cambios en Base de Datos

```sql
-- Nueva columna para descripción original
ALTER TABLE books 
ADD COLUMN original_description VARCHAR(5000) NOT NULL;

-- Columna language ya existía, confirmar que es NOT NULL
-- language VARCHAR(10) NOT NULL (ISO 639-1)
```

---

## 5. Servicio de Traducción

### 5.1 Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Ports (Application)                          │
│─────────────────────────────────────────────────────────────────────│
│  interface TranslationService {                                     │
│    translate(text: string, targetLanguage: string): Promise<string> │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Adapters (Infrastructure)                        │
│─────────────────────────────────────────────────────────────────────│
│  class OllamaTranslationService implements TranslationService {     │
│    // Usa Ollama con modelo qwen2.5:3b                              │
│    // Endpoint: POST http://ollama:11434/api/generate               │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Configuración del Modelo

| Configuración | Valor |
|---------------|-------|
| **Modelo** | qwen2.5:1.5b |
| **Servicio** | Ollama (Docker) |
| **Endpoint** | `POST http://ollama:11434/api/generate` |
| **Timeout** | 60 segundos |

### 5.3 Prompt de Traducción

```typescript
const systemPrompt = `You are a professional translator. Translate the following text to Spanish.
Rules:
- Be precise: do not add or remove information
- Maintain the original meaning and tone
- Keep technical terms when appropriate
- Output ONLY the translated text, nothing else`;

const userPrompt = `Translate this text to Spanish:\n\n${text}`;
```

### 5.4 Request a Ollama

```json
{
  "model": "qwen2.5:1.5b",
  "prompt": "<system_prompt>\n\n<user_prompt>",
  "stream": false,
  "options": {
    "temperature": 0.3,
    "top_p": 0.9
  }
}
```

### 5.5 Response de Ollama

```json
{
  "model": "qwen2.5:3b",
  "response": "Texto traducido al español...",
  "done": true
}
```

---

## 6. Cambios en CreateBookUseCase

### 6.1 Dependencias Adicionales

```typescript
interface CreateBookUseCaseDependencies {
  bookRepository: BookRepository;
  authorRepository: AuthorRepository;
  categoryRepository: CategoryRepository;
  typeRepository: TypeRepository;
  levelRepository: LevelRepository;
  embeddingService: EmbeddingService;
  translationService: TranslationService;  // NUEVO
  logger: Logger;
}
```

### 6.2 Flujo Modificado

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CreateBookUseCase                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. VALIDAR DATOS DE ENTRADA                                         │
│    - Sanitizar campos (trim)                                        │
│    - Validar campos obligatorios (incluido language)                │
│    - Validar formato language (ISO 639-1)                           │
│    - Validar límites de caracteres                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. VERIFICAR DUPLICADOS (Repository)                                │
│    - Si ISBN existe → Error 409 "ISBN ya registrado"                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. GESTIONAR ENTIDADES RELACIONADAS                                 │
│    - Autores, categorías, tipo, nivel                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. PROCESAR DESCRIPCIÓN                                             │
│    - original_description = input.description                       │
│    - Si language === 'es':                                          │
│        description = original_description                           │
│    - Si language !== 'es':                                          │
│        description = TranslationService.translate(                  │
│          original_description, 'es'                                 │
│        )                                                            │
│    - Si traducción falla → Error 503                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. GENERAR EMBEDDING                                                │
│    - Concatenar: autores + título + tipo + categorías + description │
│    - Llamar a EmbeddingService (Ollama)                             │
│    - Si falla → Error 503                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. PERSISTIR (Transacción atómica)                                  │
│    - INSERT libro con original_description Y description            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Cambios en Script seed-database.ts

El script de carga de datos debe:

1. Leer `description` del JSON → guardar en `original_description`
2. Leer `language` del JSON
3. Si `language === 'es'` → `description = original_description`
4. Si `language !== 'es'` → traducir y guardar en `description`
5. Generar embedding desde `description` (español)

---

## 8. Cambios en Script consolidate-books.ts

### 8.1 Comportamiento Actual (a cambiar)

```typescript
// ACTUAL: sobrescribe SIEMPRE
function transformBook(source: SourceBook): ConsolidatedBook {
  return {
    ...source,
    type: 'technical',    // Sobrescribe siempre
    format: 'epub',       // Sobrescribe siempre
  };
}
```

### 8.2 Comportamiento Nuevo

```typescript
// NUEVO: solo añade si no existe
function transformBook(source: SourceBook): ConsolidatedBook {
  return {
    ...source,
    // Solo añadir si no existe en source
    type: source.type ?? 'technical',
    format: source.format ?? 'epub',
  };
}
```

### 8.3 Criterios de Decisión

| Condición | Resultado |
|-----------|-----------|
| `source.type` existe y tiene valor | Mantener `source.type` |
| `source.type` no existe o es undefined | Usar `'technical'` |
| `source.format` existe y tiene valor | Mantener `source.format` |
| `source.format` no existe o es undefined | Usar `'epub'` |

---

## 9. Respuestas HTTP

| Código | Situación |
|--------|-----------|
| `201 Created` | Libro creado exitosamente |
| `400 Bad Request` | Validación fallida (language inválido, campos faltantes) |
| `409 Conflict` | ISBN duplicado |
| `503 Service Unavailable` | Servicio de traducción o embeddings no disponible |

---

## 10. Estructura del Proyecto

### 10.1 Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/application/ports/TranslationService.ts` | Puerto para servicio de traducción |
| `src/infrastructure/driven/translation/OllamaTranslationService.ts` | Implementación con Ollama |
| `src/infrastructure/driven/translation/index.ts` | Barrel export |
| `tests/unit/infrastructure/driven/translation/OllamaTranslationService.test.ts` | Tests unitarios |
| `tests/integration/infrastructure/translation/OllamaTranslationService.integration.test.ts` | Tests integración |

### 10.2 Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/domain/entities/Book.ts` | Añadir `originalDescription`, modificar validaciones |
| `src/application/use-cases/CreateBookUseCase.ts` | Integrar TranslationService |
| `src/infrastructure/driven/persistence/drizzle/schema.ts` | Nueva columna |
| `src/infrastructure/driven/persistence/mappers/BookMapper.ts` | Mapear nuevo campo |
| `src/infrastructure/driven/persistence/PostgresBookRepository.ts` | Persistir nuevo campo |
| `scripts/seed-database.ts` | Manejar traducción |
| `scripts/consolidate-books.ts` | Cambiar lógica type/format |
| `docs/db/init-db.sql` | Nueva columna |

---

## 11. Tareas de Implementación

### Tarea 1: Migración de Base de Datos
**Descripción**: Añadir columna `original_description` a la tabla `books`  
**Archivos**: 
- `drizzle/XXXX_add_original_description.sql`
- `src/infrastructure/driven/persistence/drizzle/schema.ts`
- `docs/db/init-db.sql`

**Cambios SQL**:
```sql
ALTER TABLE books 
ADD COLUMN original_description VARCHAR(5000);

-- Migrar datos existentes (si hubiera)
UPDATE books SET original_description = description WHERE original_description IS NULL;

-- Hacer NOT NULL después de migrar
ALTER TABLE books 
ALTER COLUMN original_description SET NOT NULL;
```

---

### Tarea 2: Crear Puerto TranslationService
**Descripción**: Definir interfaz del servicio de traducción  
**Archivo**: `src/application/ports/TranslationService.ts`

```typescript
export interface TranslationService {
  /**
   * Translates text to the specified target language
   * @param text - Text to translate
   * @param targetLanguage - ISO 639-1 language code (e.g., 'es')
   * @returns Translated text
   * @throws TranslationError if translation fails
   */
  translate(text: string, targetLanguage: string): Promise<string>;
}
```

---

### Tarea 3: Implementar OllamaTranslationService
**Descripción**: Implementar servicio de traducción usando Ollama con qwen2.5:3b  
**Archivo**: `src/infrastructure/driven/translation/OllamaTranslationService.ts`

**Características**:
- Usar endpoint `/api/generate`
- Timeout de 60 segundos
- Retry con backoff exponencial (3 intentos)
- Manejo de errores específico

---

### Tarea 4: Actualizar Entidad Book
**Descripción**: Añadir campo `originalDescription` y ajustar validaciones  
**Archivo**: `src/domain/entities/Book.ts`

**Cambios**:
- Añadir propiedad `originalDescription: string`
- Actualizar `CreateBookProps` y `BookPersistenceProps`
- Validar `originalDescription` igual que `description`
- Actualizar `getTextForEmbedding()` para usar `description` (no cambiar comportamiento)

---

### Tarea 5: Actualizar CreateBookUseCase
**Descripción**: Integrar lógica de traducción  
**Archivo**: `src/application/use-cases/CreateBookUseCase.ts`

**Cambios**:
- Inyectar `TranslationService`
- Antes de generar embedding:
  - Guardar input.description en `originalDescription`
  - Si language !== 'es', traducir
  - Guardar resultado en `description`

---

### Tarea 6: Actualizar BookMapper
**Descripción**: Mapear nuevo campo `original_description`  
**Archivo**: `src/infrastructure/driven/persistence/mappers/BookMapper.ts`

---

### Tarea 7: Actualizar PostgresBookRepository
**Descripción**: Persistir y recuperar `original_description`  
**Archivo**: `src/infrastructure/driven/persistence/PostgresBookRepository.ts`

---

### Tarea 8: Actualizar seed-database.ts
**Descripción**: Manejar traducción en carga de datos  
**Archivo**: `scripts/seed-database.ts`

**Cambios**:
- Inyectar TranslationService
- Procesar cada libro:
  - `original_description` = JSON.description
  - Si language === 'es' → `description` = `original_description`
  - Si language !== 'es' → traducir

---

### Tarea 9: Actualizar consolidate-books.ts
**Descripción**: Cambiar lógica de sobrescritura de type/format  
**Archivo**: `scripts/consolidate-books.ts`

**Cambios**:
```typescript
function transformBook(source: SourceBook): ConsolidatedBook {
  return {
    ...source,
    type: source.type ?? 'technical',
    format: source.format ?? 'epub',
  };
}
```

---

### Tarea 10: Tests Unitarios
**Descripción**: Crear/actualizar tests unitarios  

**Archivos**:
- `tests/unit/infrastructure/driven/translation/OllamaTranslationService.test.ts` (nuevo)
- `tests/unit/domain/entities/Book.test.ts` (actualizar)
- `tests/unit/application/use-cases/CreateBookUseCase.test.ts` (actualizar)
- `tests/unit/scripts/consolidate-books.test.ts` (actualizar)
- `tests/unit/scripts/seed-database.test.ts` (actualizar)

---

### Tarea 11: Tests de Integración
**Descripción**: Crear/actualizar tests de integración  

**Archivos**:
- `tests/integration/infrastructure/translation/OllamaTranslationService.integration.test.ts` (nuevo)
- `tests/integration/application/use-cases/CreateBookUseCase.integration.test.ts` (actualizar)

---

### Tarea 12: Tests E2E
**Descripción**: Actualizar tests e2e para verificar traducción  

**Archivos**:
- `tests/e2e/http/createBook.e2e.test.ts` (actualizar)

---

### Tarea 13: Actualizar Documentación
**Descripción**: Actualizar documentación técnica  

**Archivos**:
- `docs/db/init-db.sql` (nueva columna)
- `docs/api/openapi.yaml` (actualizar schema de Book)

---

## 12. Consideraciones Técnicas

### 12.1 Descarga del Modelo qwen2.5:1.5b

El modelo debe descargarse en el contenedor de Ollama:

```bash
# En docker-compose.yml o script de inicialización
docker exec ollama ollama pull qwen2.5:1.5b
```

**Tamaño**: ~1GB

### 12.2 Performance de Traducción

| Métrica | Valor Estimado |
|---------|----------------|
| Tiempo por descripción | 2-5 segundos |
| Tokens máximos | ~5000 (descripción completa) |
| Modelo | qwen2.5:1.5b (optimizado para traducción) |

### 12.3 Manejo de Errores

| Error | Acción |
|-------|--------|
| Ollama no disponible | Error 503, no crear libro |
| Timeout de traducción | Reintentar 3 veces, luego Error 503 |
| Respuesta vacía | Error 503, no crear libro |
| Idioma no soportado | Intentar traducción (el modelo manejará) |

### 12.4 Validación de Language

```typescript
// ISO 639-1: códigos de 2 letras en minúsculas
const ISO_639_1_REGEX = /^[a-z]{2}$/;

function isValidLanguageCode(code: string): boolean {
  return ISO_639_1_REGEX.test(code);
}
```

---

## 13. Definición de Hecho (DoD)

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Nueva columna `original_description` en BD
- [ ] Puerto `TranslationService` definido
- [ ] `OllamaTranslationService` implementado con qwen2.5:3b
- [ ] `Book` entity actualizada con `originalDescription`
- [ ] `CreateBookUseCase` integra traducción
- [ ] Script `seed-database.ts` maneja traducción
- [ ] Script `consolidate-books.ts` no sobrescribe type/format existentes
- [ ] Tests unitarios: mínimo 80% cobertura nuevos/afectados
- [ ] Tests integración: servicio de traducción
- [ ] Tests E2E: creación de libro con traducción
- [ ] Documentación actualizada (init-db.sql, openapi.yaml)
- [ ] 0 lint errors, 0 type errors, all tests green, build success

---

## 14. Referencias

- [01-project-overview.md](./01-project-overview.md) - Stack tecnológico
- [03-hu-001-create-book.md](./03-hu-001-create-book.md) - Flujo de creación de libros
- [11-hu-011-consolidate-books.md](./11-hu-011-consolidate-books.md) - Script de consolidación
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Qwen2.5 Model](https://huggingface.co/Qwen/Qwen2.5-3B)
- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
