# Design Doc: HU-012 - Buscar Libros con Filtros y Paginación

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-012 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-22 |
| **Prioridad** | Alta |
| **Estimación** | A definir |

---

## 1. Historia de Usuario

**Como** usuario del sistema,  
**Quiero** buscar libros aplicando diversos filtros combinados y recibir los resultados paginados,  
**Para** encontrar rápidamente los libros que necesito sin sobrecargar la interfaz con demasiados resultados.

---

## 2. Descripción Funcional

### 2.1 Endpoint

```
GET /api/books
```

### 2.2 Filtros Disponibles

| Filtro | Tipo | Descripción | Coincidencia |
|--------|------|-------------|--------------|
| `isbn` | string | ISBN exacto del libro | Exacta |
| `types` | string[] | Lista de nombres de tipos | Case-insensitive, OR entre valores |
| `categories` | string[] | Lista de nombres de categorías | Case-insensitive, OR entre valores |
| `levels` | string[] | Lista de nombres de niveles | Case-insensitive, OR entre valores |
| `author` | string | Texto parcial del nombre del autor | Contiene (LIKE), case-insensitive |
| `title` | string | Texto parcial del título | Contiene (LIKE), case-insensitive |
| `text` | string | Texto libre para búsqueda semántica | Similitud coseno ≥ 70% |

### 2.3 Combinación de Filtros

- **Todos los filtros se combinan con AND**
- Ejemplo: `types=["technical"]&author="martin"` → libros técnicos cuyo autor contenga "martin"

### 2.4 Comportamiento de Filtros de Lista

Para los filtros que aceptan listas (`types`, `categories`, `levels`):
- Se aplica **OR** entre los valores de la lista
- Ejemplo: `types=["technical", "reference"]` → libros que sean técnicos **O** de referencia

### 2.5 Búsqueda Semántica (filtro `text`)

- El texto se convierte a embedding usando el servicio de embeddings (Ollama)
- Se compara con los embeddings de los libros usando similitud coseno
- **Umbral mínimo de similitud: 70%** (0.7)
- Los libros con similitud < 70% **NO se incluyen** en los resultados
- **Es el filtro con mayor peso**: cuando está presente, los resultados se ordenan por score de similitud (descendente)
- El **score de similitud se incluye en la respuesta**

### 2.6 Ordenación

| Condición | Ordenación |
|-----------|------------|
| **Sin filtro `text`** | Alfabéticamente por título (A-Z) |
| **Con filtro `text`** | Por score de similitud (descendente), luego por título (A-Z) |

### 2.7 Paginación (Cursor-based)

| Parámetro | Tipo | Descripción | Default |
|-----------|------|-------------|---------|
| `limit` | number | Número máximo de resultados | 50 |
| `cursor` | string | Cursor opaco para la siguiente página | null |

**Metadatos de paginación en la respuesta:**

```json
{
  "pagination": {
    "limit": 50,
    "hasNextPage": true,
    "nextCursor": "eyJpZCI6IjEyMzQifQ==",
    "totalCount": 1523
  }
}
```

---

## 3. Criterios de Aceptación

### 3.1 Funcionales

| ID | Criterio |
|----|----------|
| AC-01 | El endpoint `GET /api/books` acepta todos los filtros definidos |
| AC-02 | Los filtros se combinan con AND |
| AC-03 | Los filtros de lista (`types`, `categories`, `levels`) aplican OR entre valores |
| AC-04 | El filtro `isbn` busca coincidencia exacta |
| AC-05 | Los filtros `author` y `title` buscan coincidencia parcial case-insensitive |
| AC-06 | El filtro `text` genera embedding y busca similitud ≥ 70% |
| AC-07 | El score de similitud se devuelve en cada libro cuando se usa `text` |
| AC-08 | Sin filtro `text`, los resultados se ordenan alfabéticamente por título |
| AC-09 | Con filtro `text`, los resultados se ordenan por similitud descendente |
| AC-10 | La paginación es cursor-based con limit default de 50 |
| AC-11 | La respuesta incluye metadatos de paginación |
| AC-12 | Si no hay resultados, se devuelve array vacío (no error) |
| AC-13 | Si tipos/categorías/niveles no existen, se devuelve array vacío (no error 400) |

### 3.2 No Funcionales

| ID | Criterio |
|----|----------|
| NF-01 | Búsqueda < 500ms para 60k libros (sin búsqueda semántica) |
| NF-02 | Búsqueda semántica < 1000ms para 60k libros |
| NF-03 | El patrón Criteria se implementa en la capa de dominio |

---

## 4. Respuesta del Endpoint

### 4.1 Campos del Libro

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `isbn` | string \| null | ISBN del libro |
| `title` | string | Título del libro |
| `author` | Author | Primer autor (o lista si se decide) |
| `type` | string | Nombre del tipo de libro |
| `categories` | Category[] | Lista de categorías |
| `level` | string \| null | Nombre del nivel |
| `format` | string | Formato del archivo |
| `description` | string | Descripción del libro |
| `similarityScore` | number \| null | Score de similitud (solo con filtro `text`) |

### 4.2 Ejemplo de Respuesta

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "isbn": "9780132350884",
        "title": "Clean Code",
        "authors": [
          { "id": "990e8400-e29b-41d4-a716-446655440004", "name": "Robert C. Martin" }
        ],
        "type": "technical",
        "categories": [
          { "id": "660e8400-e29b-41d4-a716-446655440001", "name": "programming" }
        ],
        "level": "Intermediate",
        "format": "pdf",
        "description": "A handbook of agile software craftsmanship...",
        "similarityScore": 0.87
      }
    ],
    "pagination": {
      "limit": 50,
      "hasNextPage": true,
      "nextCursor": "eyJpZCI6IjEyMzQiLCJ0aXRsZSI6IkNsZWFuIENvZGUifQ==",
      "totalCount": 1523
    }
  },
  "error": null
}
```

---

## 5. Arquitectura: Patrón Criteria en el Dominio

### 5.1 Value Objects del Dominio

El patrón Criteria se implementa como **Value Objects** en la capa de dominio, proporcionando una abstracción para filtrado y ordenación independiente de la infraestructura.

```
src/domain/
├── criteria/
│   ├── Criteria.ts           # Clase principal que agrupa filtros + orden + paginación
│   ├── Filter.ts             # Value Object para un filtro individual
│   ├── FilterField.ts        # Value Object para el nombre del campo
│   ├── FilterOperator.ts     # Enum: EQUALS, CONTAINS, IN, SIMILAR_TO
│   ├── FilterValue.ts        # Value Object para el valor (string | string[] | number)
│   ├── Filters.ts            # Colección de filtros (AND logic)
│   ├── Order.ts              # Value Object para ordenación
│   ├── OrderBy.ts            # Value Object para campo de orden
│   ├── OrderType.ts          # Enum: ASC, DESC
│   └── index.ts
```

### 5.2 Diagrama de Clases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 Criteria                                     │
│─────────────────────────────────────────────────────────────────────────────│
│ + filters: Filters                                                          │
│ + order: Order                                                              │
│ + limit: number                                                             │
│ + cursor: string | null                                                     │
│─────────────────────────────────────────────────────────────────────────────│
│ + static create(filters, order, limit, cursor): Criteria                    │
│ + hasFilters(): boolean                                                     │
│ + hasOrder(): boolean                                                       │
│ + hasCursor(): boolean                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
┌───────────────────────────────────┐   ┌───────────────────────────────────┐
│             Filters               │   │              Order                │
│───────────────────────────────────│   │───────────────────────────────────│
│ + items: Filter[]                 │   │ + orderBy: OrderBy                │
│───────────────────────────────────│   │ + orderType: OrderType            │
│ + static fromValues(filters)      │   │───────────────────────────────────│
│ + add(filter): Filters            │   │ + static asc(field): Order        │
│ + isEmpty(): boolean              │   │ + static desc(field): Order       │
│ + getByField(field): Filter|null  │   │ + static none(): Order            │
└───────────────────────────────────┘   └───────────────────────────────────┘
              │
              ▼
┌───────────────────────────────────┐
│             Filter                │
│───────────────────────────────────│
│ + field: FilterField              │
│ + operator: FilterOperator        │
│ + value: FilterValue              │
│───────────────────────────────────│
│ + static create(field, op, value) │
└───────────────────────────────────┘
```

### 5.3 Operadores de Filtro

```typescript
enum FilterOperator {
  EQUALS = 'EQUALS',           // Coincidencia exacta
  NOT_EQUALS = 'NOT_EQUALS',   // No coincide
  CONTAINS = 'CONTAINS',       // Búsqueda parcial (LIKE %value%)
  IN = 'IN',                   // Valor en lista
  GREATER_THAN = 'GT',         // Mayor que
  LESS_THAN = 'LT',            // Menor que
  SIMILAR_TO = 'SIMILAR_TO',   // Búsqueda semántica con umbral
}
```

### 5.4 Campos Filtrables (Book)

```typescript
// Campos válidos para filtrar libros
type BookFilterableFields = 
  | 'isbn'
  | 'title'
  | 'author'      // Búsqueda en author.name
  | 'type'        // Búsqueda por type.name
  | 'categories'  // Búsqueda por category.name
  | 'levels'      // Búsqueda por level.name
  | 'embedding';  // Búsqueda semántica
```

---

## 6. Flujo de Búsqueda

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SearchBooksUseCase                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. VALIDAR PARÁMETROS DE ENTRADA                                            │
│    - Validar formato de filtros                                             │
│    - Validar limit (1-100, default 50)                                      │
│    - Validar cursor si existe                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. GENERAR EMBEDDING (si hay filtro `text`)                                 │
│    - Llamar a EmbeddingService.generateEmbedding(text)                      │
│    - Si falla → Error 503                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. CONSTRUIR CRITERIA                                                        │
│    - Crear Filters con los filtros proporcionados                           │
│    - Crear Order (por similarityScore desc O por title asc)                 │
│    - Crear Criteria con filters + order + limit + cursor                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. EJECUTAR BÚSQUEDA (BookRepository.search)                                 │
│    - El repositorio traduce Criteria a SQL/Drizzle                          │
│    - Aplica filtros, orden y paginación                                     │
│    - Si hay búsqueda semántica, calcula similitud coseno                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. FORMATEAR RESPUESTA                                                       │
│    - Mapear Books a DTOs (sin embedding interno)                            │
│    - Incluir similarityScore si aplica                                      │
│    - Generar metadatos de paginación                                        │
│    - Generar nextCursor si hay más páginas                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Cambios en BookRepository

### 7.1 Nuevo Método

```typescript
interface SearchBooksResult {
  items: BookWithScore[];
  totalCount: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}

interface BookWithScore {
  book: Book;
  similarityScore: number | null;
}

interface BookRepository {
  // ... métodos existentes ...

  /**
   * Busca libros según los criterios especificados
   * 
   * @param criteria - Criterios de búsqueda (filtros, orden, paginación)
   * @param embedding - Vector de embedding para búsqueda semántica (opcional)
   * @returns Resultado paginado con libros y scores de similitud
   */
  search(criteria: Criteria, embedding?: number[]): Promise<SearchBooksResult>;
}
```

---

## 8. Estructura del Cursor

El cursor es una cadena Base64 que codifica la posición actual para la paginación:

```typescript
interface CursorData {
  // Último ID visto (para desambiguación)
  lastId: string;
  // Último valor del campo de ordenación
  lastValue: string | number;
  // Offset de similitud (para búsqueda semántica)
  lastScore?: number;
}
```

**Ejemplo:**
```
// Decodificado:
{ "lastId": "550e8400-e29b-41d4-a716-446655440000", "lastValue": "Clean Code" }

// Codificado (Base64):
eyJsYXN0SWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJsYXN0VmFsdWUiOiJDbGVhbiBDb2RlIn0=
```

---

## 9. Respuestas HTTP

| Código | Situación |
|--------|-----------|
| `200 OK` | Búsqueda exitosa (incluso si no hay resultados) |
| `400 Bad Request` | Parámetros inválidos (formato incorrecto, limit fuera de rango) |
| `503 Service Unavailable` | Servicio de embeddings no disponible (solo con filtro `text`) |

---

## 10. Tareas de Implementación

### Tarea 1: Implementar Value Objects del Patrón Criteria en el Dominio
- Crear `src/domain/criteria/` con todos los value objects
- Implementar `FilterOperator`, `FilterField`, `FilterValue`
- Implementar `Filter` y `Filters`
- Implementar `OrderBy`, `OrderType`, `Order`
- Implementar `Criteria` como clase principal
- Tests unitarios completos

### Tarea 2: Crear SearchBooksUseCase
- Implementar caso de uso que recibe parámetros HTTP
- Construir Criteria desde los parámetros
- Manejar generación de embedding si hay filtro `text`
- Definir interfaz de entrada/salida (DTOs)
- Tests unitarios con mocks

### Tarea 3: Extender BookRepository con método search
- Añadir interfaz `search(criteria, embedding?)` al puerto
- Definir tipos `SearchBooksResult` y `BookWithScore`
- Tests unitarios del puerto

### Tarea 4: Implementar PostgresBookRepository.search
- Traducir Criteria a queries Drizzle
- Implementar filtros: EQUALS, CONTAINS, IN
- Implementar búsqueda semántica con pgvector (similitud coseno)
- Implementar paginación cursor-based
- Calcular totalCount eficientemente
- Tests de integración

### Tarea 5: Crear Controller y Routes HTTP
- Implementar `BooksController.search()`
- Crear schemas Zod para validación de query params
- Registrar ruta GET /api/books
- Tests unitarios del controller

### Tarea 6: Tests E2E
- Tests de búsqueda con filtros individuales
- Tests de combinación de filtros (AND)
- Tests de filtros de lista (OR)
- Tests de búsqueda semántica
- Tests de paginación cursor-based
- Tests de casos edge (sin resultados, tipos inexistentes)

### Tarea 7: Actualizar Documentación
- Actualizar OpenAPI spec
- Actualizar README si necesario

---

## 11. Definición de Hecho (DoD)

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Mínimo 80% de tests unitarios y 100% de tests funcionales nuevos/afectados
- [ ] Patrón Criteria implementado en dominio como Value Objects
- [ ] SearchBooksUseCase implementado y testeado
- [ ] BookRepository.search implementado y testeado
- [ ] Endpoint GET /api/books funcionando
- [ ] Paginación cursor-based funcionando
- [ ] Búsqueda semántica con umbral 70% funcionando
- [ ] Score de similitud incluido en respuesta
- [ ] OpenAPI spec actualizada
- [ ] 0 lint errors, 0 type errors, all tests green, build success

---

## 12. Referencias

- [01-project-overview.md](./01-project-overview.md) - Stack tecnológico y modelo de dominio
- [02-project-structure.md](./02-project-structure.md) - Arquitectura hexagonal
- [03-hu-001-create-book.md](./03-hu-001-create-book.md) - Referencia de estructura de Book
- [pgvector Documentation](https://github.com/pgvector/pgvector) - Operadores de similitud
- [Cursor Pagination Pattern](https://www.sitepoint.com/paginating-real-time-data-cursor-based-pagination/)
