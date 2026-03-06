# Design Doc: HU-003 - Nivel de Dificultad en Libros

> ⚠️ **NOTA**: Esta historia de usuario ha sido **parcialmente supersedida** por [HU-008](./08-hu-008-type-category-level-relationships.md).
> 
> **Cambios importantes de HU-008**:
> - `BookLevel` ya NO es un Value Object enum, sino una **Entidad `Level`** con tabla propia
> - Los niveles se crean **dinámicamente** según los datos de entrada
> - Existe relación **N:M entre Type y Level** (tabla `type_levels`)
> - Se valida que el nivel pertenezca al tipo del libro al crear
> 
> Este documento se mantiene como referencia histórica del diseño original.

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-003 |
| **Estado** | Supersedida por HU-008 |
| **Fecha** | 2026-02-17 |
| **Prioridad** | Media |
| **Estimación** | A definir |

---

## 1. Historia de Usuario

**Como** usuario de la biblioteca,  
**Quiero** poder asignar un nivel de dificultad a mis libros técnicos,  
**Para** organizar mi aprendizaje de forma progresiva y filtrar libros según mi experiencia.

---

## 2. Resumen de Cambios

Esta historia de usuario añade una nueva propiedad opcional a los libros para clasificarlos por nivel de dificultad.
No hay que añadir el campo level en el fichero de datos iniciales books.json.

### 2.1 Cambios en el Modelo de Dominio

| Cambio | Descripción |
|--------|-------------|
| **BookLevel (nuevo)** | Nuevo Value Object para representar el nivel de dificultad |
| **Book.level** | Nueva propiedad nullable de tipo `BookLevel` |

### 2.2 Cambios en Infraestructura

| Cambio | Descripción |
|--------|-------------|
| **Enum `book_level`** | Nuevo enum PostgreSQL con los 5 niveles válidos |
| **Columna `level`** | Nueva columna nullable en tabla `books` |
| **Schema Drizzle** | Actualización con enum y columna |

### 2.3 Cambios en API

| Cambio | Descripción |
|--------|-------------|
| **POST /books** | Acepta campo opcional `level` |
| **Validación** | Error 400 para valores inválidos |

### 2.4 Cambios en Datos

| Cambio | Descripción |
|--------|-------------|
| **seed-database.ts** | Actualizado para leer y persistir el nivel |

---

## 3. Valores del Enum BookLevel

| Valor | Descripción |
|-------|-------------|
| `Beginner` | Para principiantes sin experiencia previa |
| `Intermediate` | Para desarrolladores con conocimientos básicos |
| `Advanced` | Para profesionales experimentados |
| `Beginner to intermediate` | Cubre desde principiante hasta nivel intermedio |
| `Intermediate to advanced` | Cubre desde intermedio hasta nivel avanzado |

**Nota:** El campo es **nullable**. Libros sin nivel asignado (ej: certificaciones, referencias) tendrán `level: null`.

---

## 4. Criterios de Aceptación

### 4.1 Funcionales

| Criterio | Descripción |
|----------|-------------|
| **Nivel opcional** | Un libro puede tener o no un nivel de dificultad |
| **Valores válidos** | Solo se aceptan los 5 valores definidos en el enum |
| **Case-sensitive** | Los valores deben coincidir exactamente (ej: `Beginner`, no `beginner`) |
| **Indexable** | El campo está preparado para búsquedas/filtros futuros |

### 4.2 API HTTP

| Criterio | Descripción |
|----------|-------------|
| **Campo opcional** | POST `/books` acepta campo `level` opcional |
| **Sin nivel** | POST `/books` sin `level` crea libro con `level: null` |
| **Nivel inválido** | POST `/books` con nivel inválido retorna `400 Bad Request` |

### 4.3 Mensaje de Error para Nivel Inválido

```
Invalid book level: "{value}". Valid levels are: Beginner, Intermediate, Advanced, Beginner to intermediate, Intermediate to advanced
```

### 4.4 Carga Inicial

| Criterio | Descripción |
|----------|-------------|
| **Campo en JSON** | El fichero `books.json` incluye campo `level` cuando aplica |
| **Sin nivel** | Libros sin campo `level` en JSON quedan con `level: null` |

---

## 5. Modelo de Dominio

### 5.1 Value Object BookLevel (nuevo)

```typescript
export const BOOK_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Beginner to intermediate',
  'Intermediate to advanced',
] as const;

export type BookLevelValue = (typeof BOOK_LEVELS)[number];

export class BookLevel {
  private constructor(public readonly value: BookLevelValue) {
    Object.freeze(this);
  }

  static create(value: string): BookLevel {
    if (!BookLevel.isValid(value)) {
      throw new InvalidBookLevelError(value);
    }
    return new BookLevel(value as BookLevelValue);
  }

  static fromPersistence(value: BookLevelValue): BookLevel {
    return new BookLevel(value);
  }

  static isValid(value: string): value is BookLevelValue {
    return BOOK_LEVELS.includes(value as BookLevelValue);
  }

  static getAllLevels(): readonly BookLevelValue[] {
    return BOOK_LEVELS;
  }

  equals(other: BookLevel): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

### 5.2 Entidad Book (actualizada)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| ... | ... | ... | (campos existentes) |
| `level` | BookLevel \| null | No | **Nivel de dificultad del libro** |

```typescript
interface Book {
  // ... campos existentes ...
  level: BookLevel | null;  // NUEVO
}
```

### 5.3 Actualización de Props

```typescript
// CreateBookProps
export interface CreateBookProps {
  // ... campos existentes ...
  level?: string | null;  // NUEVO
}

// BookPersistenceProps
export interface BookPersistenceProps {
  // ... campos existentes ...
  level: BookLevelValue | null;  // NUEVO
}

// UpdateBookProps
export interface UpdateBookProps {
  // ... campos existentes ...
  level?: string | null;  // NUEVO
}
```

---

## 6. Esquema de Base de Datos

### 6.1 Nuevo Enum PostgreSQL

```sql
CREATE TYPE book_level AS ENUM (
    'Beginner',
    'Intermediate',
    'Advanced',
    'Beginner to intermediate',
    'Intermediate to advanced'
);
```

### 6.2 Nueva Columna en Tabla books

```sql
ALTER TABLE books ADD COLUMN level book_level;
```

### 6.3 Schema Drizzle

```typescript
// Nuevo enum
export const bookLevelEnum = pgEnum('book_level', [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Beginner to intermediate',
  'Intermediate to advanced',
]);

// En la tabla books
export const books = pgTable('books', {
  // ... columnas existentes ...
  level: bookLevelEnum('level'),  // nullable por defecto
});
```

---

## 7. Actualización API REST

### 7.1 Request Body (POST /books)

```json
{
  "title": "Head First C#",
  "authors": ["Andrew Stellman", "Jennifer Greene"],
  "type": "technical",
  "categories": ["Programming", "C#"],
  "format": "epub",
  "description": "A beginner-friendly guide...",
  "level": "Beginner"
}
```

### 7.2 Request sin nivel (válido)

```json
{
  "title": "CISSP Study Guide",
  "authors": ["Mike Chapple"],
  "type": "technical",
  "categories": ["Security", "Certifications"],
  "format": "pdf",
  "description": "Certification preparation..."
}
```

### 7.3 Response Body

```json
{
  "id": "uuid",
  "isbn": "9781098141776",
  "title": "Head First C#",
  "authors": [
    { "id": "uuid", "name": "Andrew Stellman" },
    { "id": "uuid", "name": "Jennifer Greene" }
  ],
  "type": { "id": "uuid", "name": "technical" },
  "categories": [...],
  "format": "epub",
  "level": "Beginner",
  "available": false,
  "createdAt": "2026-02-17T...",
  "updatedAt": "2026-02-17T..."
}
```

### 7.4 Respuestas HTTP

| Código | Situación |
|--------|-----------|
| `201 Created` | Libro creado exitosamente (con o sin nivel) |
| `400 Bad Request` | Nivel inválido proporcionado |

---

## 8. Actualización Datos Iniciales

### 8.1 Estructura books.json

```json
[
  {
    "isbn": "9781098141776",
    "title": "Head First C#, 5th Edition",
    "authors": ["Andrew Stellman", "Jennifer Greene"],
    "description": "...",
    "type": "technical",
    "categories": ["Software Development", "C#"],
    "format": "epub",
    "available": false,
    "level": "Beginner"
  },
  {
    "isbn": "9781098147433",
    "title": "C# 12 in a Nutshell",
    "authors": ["Joseph Albahari"],
    "description": "...",
    "type": "technical",
    "categories": ["Software Development", "C#"],
    "format": "epub",
    "available": false,
    "level": "Intermediate to advanced"
  },
  {
    "isbn": "9781394254699",
    "title": "ISC2 CISSP Certified Information Systems Security Professional",
    "authors": ["Mike Chapple", "James Michael Stewart"],
    "description": "...",
    "type": "technical",
    "categories": ["Security", "Certifications"],
    "format": "epub",
    "available": false
  }
]
```

**Nota:** El último libro no tiene `level` porque es material de certificación donde el nivel no aplica.

### 8.2 Ejemplos de Asignación de Niveles

| Libro | Nivel | Justificación |
|-------|-------|---------------|
| Head First C# | `Beginner` | "No experience needed" en descripción |
| C# 12 in a Nutshell | `Intermediate to advanced` | "intermediate and advanced programmers" |
| Clean Architecture with .NET | `Advanced` | Requiere experiencia previa en arquitectura |
| C# 14 and .NET 10 Fundamentals | `Beginner to intermediate` | "beginners and intermediate programmers" |
| CISSP Study Guide | `null` | Material de certificación, nivel no aplica |

---

## 8. Subtareas (Ordenadas por Dependencia)

### Grafo de Dependencias

```
┌─────────────────────┐       
│  1. domain-level-vo │       
│  (Value Object)     │       
└─────────┬───────────┘       
          │                   
          ▼                   
┌─────────────────────┐              ┌─────────────────────┐
│  2. entity-book     │              │  3. db-schema       │
│  (Entidad Book)     │              │  (Drizzle + Enum)   │
└─────────┬───────────┘              └─────────┬───────────┘
          │                                    │
          ├────────────────────────────────────┤
          │                                    │
          ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│  4. persistence     │◄─────────────│                     │
│  (Mapper + Repo)    │              │                     │
└─────────┬───────────┘              └─────────────────────┘
          │                   
          ▼                   
┌─────────────────────┐       
│  5. use-case        │       
│  (CreateBookUseCase)│       
└─────────┬───────────┘       
          │                   
          ├───────────────────┤
          │                   │
          ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│  6. http-layer  │   │  7. seed-script │
│  (API HTTP)     │   │  (Carga inicial)│
└─────────┬───────┘   └─────────┬───────┘
          │                     │
          └─────────────────────┤
                                │
                                ▼
                    ┌─────────────────────┐
                    │  8. integration-e2e │
                    │  (Tests finales)    │
                    └─────────────────────┘
```

### Lista de Subtareas

| # | Branch | Descripción | Depende de | Est. |
|---|--------|-------------|------------|------|
| 1 | `task/HU-003-domain-level-vo` | Crear Value Object `BookLevel` siguiendo patrón de `BookFormat` | - | S |
| 2 | `task/HU-003-entity-book` | Añadir propiedad `level: BookLevel \| null` a entidad `Book` | 1 | S |
| 3 | `task/HU-003-db-schema` | Crear enum PostgreSQL y añadir columna `level` en schema Drizzle | 1 | S |
| 4 | `task/HU-003-persistence` | Actualizar `BookMapper` y `PostgresBookRepository` | 2, 3 | M |
| 5 | `task/HU-003-use-case` | Modificar `CreateBookUseCase` para aceptar `level` | 2, 4 | S |
| 6 | `task/HU-003-http-layer` | Actualizar schemas Zod, controller y rutas HTTP | 5 | M |
| 7 | `task/HU-003-seed-script` | Actualizar script de carga inicial para leer campo `level` | 5, 7 | M |
| 8 | `task/HU-003-integration-e2e` | Tests de integración y E2E | 6, 8 | M |

**Leyenda estimaciones:** S = Small (< 1h), M = Medium (1-3h)

---

## 10. Orden de Ejecución Lineal

```
1. task/HU-003-domain-level-vo   → Value Object BookLevel
2. task/HU-003-entity-book       → Entidad Book con level
3. task/HU-003-db-schema         → Enum y columna en Drizzle
4. task/HU-003-persistence       → Mapper y Repository
5. task/HU-003-use-case          → CreateBookUseCase
6. task/HU-003-http-layer        → Controller, schemas, rutas
7. task/HU-003-seed-script       → Script de carga
8. task/HU-003-integration-e2e   → Tests integración y E2E
```

---

## 11. Detalle de Subtareas

### TASK-001: Crear Value Object BookLevel

**Branch:** `task/HU-003-domain-level-vo`

**Descripción:** Crear el Value Object `BookLevel` siguiendo el patrón existente de `BookFormat`.

**Entregables:**
- `src/domain/value-objects/BookLevel.ts`
- `src/domain/errors/DomainErrors.ts` (añadir `InvalidBookLevelError`)
- Tests unitarios `tests/unit/domain/value-objects/BookLevel.test.ts`
- Actualizar `src/domain/value-objects/index.ts`

---

### TASK-002: Añadir level a entidad Book

**Branch:** `task/HU-003-entity-book`

**Descripción:** Añadir la propiedad `level` a la entidad `Book`.

**Entregables:**
- Actualizar `src/domain/entities/Book.ts`:
  - Añadir `level: BookLevel | null` al constructor
  - Actualizar `CreateBookProps`, `BookPersistenceProps`, `UpdateBookProps`
  - Actualizar métodos `create()`, `fromPersistence()`, `update()`
- Actualizar tests `tests/unit/domain/entities/Book.test.ts`

---

### TASK-003: Actualizar schema de base de datos

**Branch:** `task/HU-003-db-schema`

**Descripción:** Crear enum PostgreSQL y añadir columna en Drizzle.

**Entregables:**
- Actualizar `src/infrastructure/driven/persistence/drizzle/schema.ts`:
  - Añadir `bookLevelEnum`
  - Añadir columna `level` a tabla `books`
- Generar migración: `npm run db:generate`
- Actualizar `docs/db/init-db.sql` con nuevo enum y columna

---

### TASK-004: Actualizar Mapper y Repository

**Branch:** `task/HU-003-persistence`

**Descripción:** Actualizar `BookMapper` y `PostgresBookRepository` para manejar el campo `level`.

**Entregables:**
- Actualizar `src/infrastructure/driven/persistence/mappers/BookMapper.ts`
- Actualizar `src/infrastructure/driven/persistence/PostgresBookRepository.ts`
- Tests unitarios actualizados
- Tests de integración actualizados

---

### TASK-005: Actualizar CreateBookUseCase

**Branch:** `task/HU-003-use-case`

**Descripción:** Modificar el caso de uso para aceptar y procesar el campo `level`.

**Entregables:**
- Actualizar `src/application/use-cases/CreateBookUseCase.ts`
- Tests unitarios actualizados
- Tests de integración actualizados

---

### TASK-006: Actualizar capa HTTP

**Branch:** `task/HU-003-http-layer`

**Descripción:** Actualizar schemas Zod, controller y rutas HTTP.

**Entregables:**
- Actualizar `src/infrastructure/driver/http/schemas/book.schemas.ts`
- Actualizar `src/infrastructure/driver/http/controllers/BooksController.ts`
- Actualizar `docs/api/openapi.yaml`
- Tests unitarios actualizados

---

### TASK-007: Actualizar script de carga

**Branch:** `task/HU-003-seed-script`

**Descripción:** Actualizar el script de seed para leer y persistir el campo `level`.

**Entregables:**
- Actualizar `apps/api/scripts/seed-database.ts`
- Tests del script actualizados

---

### TASK-008: Tests de integración y E2E

**Branch:** `task/HU-003-integration-e2e`

**Descripción:** Añadir y actualizar tests de integración y E2E.

**Entregables:**
- Tests de integración para `CreateBookUseCase` con `level`
- Tests de integración para `PostgresBookRepository` con `level`
- Tests E2E HTTP para POST `/books` con `level`
- Tests E2E para casos de error (nivel inválido)

---

## 12. Consideraciones Técnicas

### 12.1 Inmutabilidad del Level Post-Creación

Siguiendo las reglas establecidas en HU-001, el campo `level` **NO es editable** después de la creación del libro, ya que forma parte del contenido semántico.

| Campo | Editable |
|-------|----------|
| `level` | NO |
| `available` | SÍ |
| `path` | SÍ |

### 12.2 Embedding

El campo `level` **NO se incluye** en el texto para generar embeddings. El método `getTextForEmbedding()` permanece sin cambios ya que el nivel es metadata de clasificación, no contenido semántico.

### 12.3 Validación Case-Sensitive

Los valores deben coincidir exactamente:

| Input | Válido |
|-------|--------|
| `Beginner` | ✅ |
| `beginner` | ❌ |
| `BEGINNER` | ❌ |
| `Intermediate to advanced` | ✅ |
| `intermediate to advanced` | ❌ |

---

## 13. Definición de Hecho (DoD)

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Mínimo 80% de tests unitarios y 100% de tests funcionales nuevos/afectados
- [ ] Value Object `BookLevel` implementado con tests
- [ ] Entidad `Book` actualizada con propiedad `level`
- [ ] Schema Drizzle actualizado con migración generada
- [ ] Mapper y Repository actualizados
- [ ] Caso de uso `CreateBookUseCase` actualizado
- [ ] API HTTP actualizada (schemas, controller)
- [ ] OpenAPI spec actualizada (`docs/api/openapi.yaml`)
- [ ] JSON de datos iniciales actualizado con niveles
- [ ] Script de seed actualizado
- [ ] Tests de integración y E2E pasando
- [ ] 0 lint errors, 0 type errors, all tests green, build success
- [ ] PR creada de `feature/HU-003-book-level` → `dev`

---

## 14. Referencias

- [01-project-overview.md](./01-project-overview.md) - Stack tecnológico y modelo de dominio
- [02-project-structure.md](./02-project-structure.md) - Arquitectura hexagonal
- [03-hu-001-create-book.md](./03-hu-001-create-book.md) - Caso de uso de creación de libros
- [04-hu-002-initial-data-load.md](./04-hu-002-initial-data-load.md) - Carga inicial de datos
