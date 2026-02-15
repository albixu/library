# Design Doc: HU-002 - Carga Inicial de Datos y Reestructuración del Modelo

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-002 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-14 |
| **Prioridad** | Alta |
| **Estimación** | A definir |

---

## 1. Historia de Usuario

**Como** Administrador único del sistema,  
**Quiero** cargar datos iniciales de libros desde múltiples ficheros JSON de origen, consolidándolos en un único fichero sin duplicados, y poblar la base de datos con esta información,  
**Para** tener un catálogo inicial de libros listos para búsqueda semántica sin tener que introducirlos manualmente uno a uno.

---

## 2. Resumen de Cambios

Esta historia de usuario implica varios cambios estructurales importantes:

### 2.1 Cambios en el Modelo de Dominio

| Cambio | Descripción |
|--------|-------------|
| **Authors (nuevo)** | Nueva entidad `Author` con relación N:N con `Book` |
| **BookType** | De Value Object (enum) a entidad almacenada en BD con tabla `types` |
| **Book.author** | Cambia de `string` a `Author[]` (múltiples autores) |

### 2.2 Cambios en Infraestructura

| Cambio | Descripción |
|--------|-------------|
| **Tabla `authors`** | Nueva tabla para autores con nombre único |
| **Tabla `book_authors`** | Nueva tabla de unión N:N |
| **Tabla `types`** | Nueva tabla para tipos de libro |
| **Eliminación enum `book_type`** | Se elimina el enum de PostgreSQL |
| **Ubicación `init-db.sql`** | Se mueve de `apps/api-cli/docker/` a `docs/db/` |

### 2.3 Eliminación del CLI

Se elimina completamente el adaptador CLI ya que no se utilizará de momento.

### 2.4 Script de Carga

Nuevo script para procesar JSON y cargar datos en BD usando el caso de uso existente.

---

## 3. Modelo de Dominio Actualizado

### 3.1 Entidad Author (nueva)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `name` | string | Sí | Nombre del autor (único, max 300 chars) |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |
| `updatedAt` | timestamp | Sí | Fecha de última modificación |

### 3.2 Entidad BookType (antes Value Object)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `name` | string | Sí | Nombre del tipo (único, max 50 chars) |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |
| `updatedAt` | timestamp | Sí | Fecha de última modificación |

**Valores iniciales:** `technical`, `novel`, `biography`

### 3.3 Entidad Book (actualizada)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `isbn` | ISBN | No | ISBN del libro (único cuando presente) |
| `title` | string | Sí | Título del libro (max 500) |
| `authors` | Author[] | Sí | **Lista de autores** (mínimo 1) - Relación N:M |
| `description` | string | Sí | Sinopsis del contenido (max 5000) |
| `type` | BookType | Sí | **Referencia a entidad Type** - Relación N:1 |
| `categories` | Category[] | Sí | Lista de categorías (1-10) - Relación N:M |
| `format` | BookFormat | Sí | Formato del archivo (enum) |
| `available` | boolean | Sí | Indica disponibilidad (default: false) |
| `path` | string | No | Ruta del archivo (max 1000) |
| `embedding` | vector | No | Vector 768 dimensiones |
| `createdAt` | timestamp | Sí | Fecha de creación |
| `updatedAt` | timestamp | Sí | Fecha de modificación |

### 3.4 Relaciones Actualizadas

```
┌─────────────┐       N:M       ┌─────────────┐
│   Author    │◄───────────────►│    Book     │
└─────────────┘                 └─────────────┘
                                      │
                                      │ N:1
                                      ▼
                                ┌─────────────┐
                                │  BookType   │
                                └─────────────┘
                                      │
                                      │ N:M
                                      ▼
                                ┌─────────────┐
                                │  Category   │
                                └─────────────┘
```

---

## 4. Estructura de Ficheros JSON

### 4.1 Ficheros de Origen

Ubicación: `apps/api-cli/data/source/`

Múltiples ficheros JSON con estructura:

```json
{
  "id": "9781394254699",
  "language": "en",
  "level": "Intermediate to advanced",
  "title": "Book Title",
  "authors": ["Author 1", "Author 2"],
  "pages": "...",
  "publication_date": "June 2024",
  "description": "Book description...",
  "tags": ["Tag1", "Tag2", "Tag3"]
}
```

### 4.2 Fichero de Destino Consolidado

Ubicación: `docs/db/books.json`

Estructura transformada:

```json
[
  {
    "isbn": "9781394254699",
    "title": "Book Title",
    "authors": ["Author 1", "Author 2"],
    "description": "Book description...",
    "type": "technical",
    "categories": ["Category1", "Category2"],
    "format": "pdf",
    "available": false
  }
]
```

### 4.3 Reglas de Transformación

| Campo Origen | Campo Destino | Transformación |
|--------------|---------------|----------------|
| `id` | `isbn` | Directo (es el ISBN) |
| `title` | `title` | Directo |
| `authors` | `authors` | Directo (ya es array) |
| `description` | `description` | Directo |
| `tags` | `categories` | Renombrar propiedad |
| - | `type` | Añadir siempre valor `"technical"` |
| - | `format` | Valor por defecto `"pdf"` |
| - | `available` | Valor por defecto `false` |
| `language` | - | Ignorar |
| `level` | - | Ignorar |
| `pages` | - | Ignorar |
| `publication_date` | - | Ignorar |

### 4.4 Detección de Duplicados (Consolidación)

- **Criterio:** Campo `id` (ISBN) del fichero origen
- **Comportamiento:** Si un libro aparece en múltiples ficheros, se conserva **el primero encontrado**
- El orden de procesamiento es alfabético por nombre de fichero

---

## 5. Esquema de Base de Datos Actualizado

### 5.1 Nueva Tabla: `types`

```sql
CREATE TABLE IF NOT EXISTS types (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO types (id, name) VALUES
    (gen_random_uuid(), 'technical'),
    (gen_random_uuid(), 'novel'),
    (gen_random_uuid(), 'biography');
```

### 5.2 Nueva Tabla: `authors`

```sql
CREATE TABLE IF NOT EXISTS authors (
    id UUID PRIMARY KEY,
    name VARCHAR(300) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authors_name ON authors (name);
```

### 5.3 Nueva Tabla de Unión: `book_authors`

```sql
CREATE TABLE IF NOT EXISTS book_authors (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    PRIMARY KEY (book_id, author_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_authors_author_id ON book_authors (author_id);
```

### 5.4 Modificación Tabla: `books`

```sql
-- Se elimina la columna author (ahora es relación N:M)
-- Se cambia type de ENUM a referencia UUID

CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY,
    isbn VARCHAR(13) UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    type_id UUID NOT NULL REFERENCES types(id),
    format book_format NOT NULL,
    available BOOLEAN NOT NULL DEFAULT FALSE,
    path VARCHAR(1000),
    embedding vector(768),
    normalized_title VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Nota:** Se elimina `author`, `normalized_author` ya que ahora es relación N:M con tabla `authors`.

### 5.5 Cambios en Detección de Duplicados

Con el cambio a múltiples autores, la tríada de duplicados cambia:

| Antes | Ahora |
|-------|-------|
| `{author, title, format}` | `{isbn}` (único) |

La detección por tríada se simplifica: solo se usa ISBN cuando está presente.

---

## 6. Script de Consolidación JSON

### 6.1 Ubicación

`apps/api-cli/scripts/consolidate-books.ts`

### 6.2 Funcionalidad

1. Lee todos los ficheros `*.json` de `apps/api-cli/data/source/`
2. Parsea cada fichero y extrae los libros
3. Detecta duplicados por ISBN (campo `id` del origen)
4. Conserva el primer libro encontrado para cada ISBN
5. Transforma la estructura:
   - Renombra `id` → `isbn`
   - Renombra `tags` → `categories`
   - Añade `type: "technical"`
   - Añade `format: "pdf"` (valor por defecto)
   - Añade `available: false`
   - Elimina campos no necesarios
6. Escribe el resultado en `docs/db/books.json`

### 6.3 Ejecución

```bash
npm run consolidate:books
# o
npx tsx scripts/consolidate-books.ts
```

---

## 7. Script de Carga de Datos

### 7.1 Ubicación

`apps/api-cli/scripts/seed-database.ts`

### 7.2 Funcionalidad

1. Lee `docs/db/books.json`
2. Para cada libro:
   - Verifica si ya existe (por ISBN) → Si existe, lo salta
   - Crea/obtiene los autores necesarios
   - Crea/obtiene las categorías necesarias
   - Obtiene el tipo por nombre
   - Llama al caso de uso `CreateBookUseCase`
3. Es **idempotente**: puede ejecutarse múltiples veces sin duplicar datos
4. No actualiza libros existentes (solo carga inicial)

### 7.3 Ejecución

**Manual:**
```bash
npm run seed:database
# o
docker exec library-api-dev npm run seed:database
```

**Automática (Docker):**
Se ejecuta como parte del proceso de inicialización si la BD está vacía.

### 7.4 Integración con Docker

El script se ejecuta automáticamente al iniciar el contenedor si:
- La tabla `books` está vacía
- El fichero `docs/db/books.json` existe

Se añade lógica al `entrypoint.dev.sh`:

```bash
# Check if database is empty and seed if needed
if [ "$AUTO_SEED" = "true" ]; then
  npm run seed:database --if-empty
fi
```

---

## 8. Cambios en la Arquitectura

### 8.1 Nuevos Puertos (Ports)

```typescript
// application/ports/AuthorRepository.ts
export interface AuthorRepository {
  save(author: Author): Promise<void>;
  findById(id: string): Promise<Author | null>;
  findByName(name: string): Promise<Author | null>;
  findOrCreate(name: string): Promise<Author>;
}

// application/ports/TypeRepository.ts
export interface TypeRepository {
  findById(id: string): Promise<BookType | null>;
  findByName(name: string): Promise<BookType | null>;
  findAll(): Promise<BookType[]>;
}
```

### 8.2 Nuevos Adaptadores (Adapters)

```
infrastructure/driven/persistence/
├── PostgresAuthorRepository.ts
├── PostgresTypeRepository.ts
└── mappers/
    ├── AuthorMapper.ts
    └── TypeMapper.ts
```

### 8.3 Eliminación del CLI

Se eliminan completamente:
- `src/infrastructure/driver/cli/` (todo el directorio)
- `src/cli.ts` (entry point)
- Tests relacionados en `tests/unit/infrastructure/driver/cli/`
- Tests E2E en `tests/e2e/cli/`

### 8.4 Actualización CreateBookUseCase

El caso de uso se actualiza para:
- Aceptar `authors: string[]` en lugar de `author: string`
- Crear/obtener autores mediante `AuthorRepository.findOrCreate()`
- Obtener el tipo mediante `TypeRepository.findByName()`

---

## 9. Actualización API REST

### 9.1 Request Body (POST /books)

**Antes:**
```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "type": "technical",
  ...
}
```

**Después:**
```json
{
  "title": "Clean Code",
  "authors": ["Robert C. Martin"],
  "type": "technical",
  ...
}
```

### 9.2 Response Body

```json
{
  "id": "uuid",
  "isbn": "9780132350884",
  "title": "Clean Code",
  "authors": [
    { "id": "uuid", "name": "Robert C. Martin" }
  ],
  "type": { "id": "uuid", "name": "technical" },
  "categories": [...],
  "format": "pdf",
  "available": false,
  "createdAt": "2026-02-14T...",
  "updatedAt": "2026-02-14T..."
}
```

---

## 10. Reorganización de Documentación

### 10.1 Nuevo Directorio

```
docs/
├── api/
│   └── openapi.yaml
├── db/                    # NUEVO
│   ├── init-db.sql        # Movido desde apps/api-cli/docker/
│   └── books.json         # Generado por script
└── design_docs/
    ├── 01-project-overview.md
    ├── 02-project-structure.md
    ├── 03-hu-001-create-book.md
    └── 04-hu-002-initial-data-load.md
```

### 10.2 Actualización docker-compose.yml

```yaml
volumes:
  # Init script moved to docs/db/
  - ./docs/db/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
```

---

## 11. Subtareas

### TASK-001: Crear estructura de datos de origen
**Descripción:** Crear el directorio `apps/api-cli/data/source/` con ficheros JSON de ejemplo.
**Entregables:**
- Directorio `apps/api-cli/data/source/`
- Al menos 2-3 ficheros JSON con datos de prueba siguiendo la estructura de origen
- `.gitignore` actualizado si es necesario

---

### TASK-002: Crear directorio docs/db y mover init-db.sql
**Descripción:** Reorganizar la documentación de BD.
**Entregables:**
- Crear directorio `docs/db/`
- Mover `apps/api-cli/docker/init-db.sql` a `docs/db/init-db.sql`
- Actualizar `docker-compose.yml` con nueva ruta
- Actualizar `docker-compose.prod.yml` si existe referencia

---

### TASK-003: Implementar entidad Author
**Descripción:** Crear la nueva entidad Author en el dominio.
**Entregables:**
- `src/domain/entities/Author.ts`
- Tests unitarios `tests/unit/domain/entities/Author.test.ts`
- Actualizar `src/domain/entities/index.ts`

---

### TASK-004: Transformar BookType de Value Object a Entidad
**Descripción:** Convertir BookType de enum/value object a entidad con persistencia.
**Entregables:**
- `src/domain/entities/BookType.ts` (nueva entidad)
- Eliminar `src/domain/value-objects/BookType.ts`
- Tests unitarios `tests/unit/domain/entities/BookType.test.ts`
- Actualizar `src/domain/index.ts`
- Actualizar imports en toda la aplicación

---

### TASK-005: Actualizar entidad Book para múltiples autores
**Descripción:** Modificar Book para soportar array de autores y referencia a BookType.
**Entregables:**
- Actualizar `src/domain/entities/Book.ts`
  - Cambiar `author: string` → `authors: Author[]`
  - Cambiar `type: BookType` (value object) → `type: BookType` (entidad)
- Actualizar tests `tests/unit/domain/entities/Book.test.ts`
- Actualizar `getTextForEmbedding()` para concatenar todos los autores

---

### TASK-006: Actualizar esquema de base de datos
**Descripción:** Crear nuevas tablas y modificar existentes.
**Entregables:**
- Actualizar `docs/db/init-db.sql`:
  - Crear tabla `types` con datos iniciales
  - Crear tabla `authors`
  - Crear tabla `book_authors`
  - Modificar tabla `books` (eliminar `author`, añadir `type_id`)
  - Eliminar enum `book_type`
- Actualizar `src/infrastructure/driven/persistence/drizzle/schema.ts`
- Generar nueva migración con Drizzle

---

### TASK-007: Implementar AuthorRepository
**Descripción:** Crear puerto e implementación para gestión de autores.
**Entregables:**
- `src/application/ports/AuthorRepository.ts`
- `src/infrastructure/driven/persistence/PostgresAuthorRepository.ts`
- `src/infrastructure/driven/persistence/mappers/AuthorMapper.ts`
- Tests unitarios y de integración

---

### TASK-008: Implementar TypeRepository
**Descripción:** Crear puerto e implementación para gestión de tipos.
**Entregables:**
- `src/application/ports/TypeRepository.ts`
- `src/infrastructure/driven/persistence/PostgresTypeRepository.ts`
- `src/infrastructure/driven/persistence/mappers/TypeMapper.ts`
- Tests unitarios y de integración

---

### TASK-009: Actualizar BookRepository y BookMapper
**Descripción:** Adaptar repositorio y mapper para nuevas relaciones.
**Entregables:**
- Actualizar `PostgresBookRepository.ts` para manejar relaciones N:M con autores
- Actualizar `BookMapper.ts` para mapear autores y tipo
- Actualizar queries de búsqueda de duplicados
- Tests de integración actualizados

---

### TASK-010: Actualizar CreateBookUseCase
**Descripción:** Adaptar caso de uso para nueva estructura.
**Entregables:**
- Actualizar `CreateBookUseCase.ts`:
  - Aceptar `authors: string[]`
  - Usar `AuthorRepository.findOrCreate()` para cada autor
  - Usar `TypeRepository.findByName()` para obtener tipo
- Actualizar tests unitarios
- Actualizar tests de integración

---

### TASK-011: Actualizar API HTTP (Controller, Routes, Schemas)
**Descripción:** Adaptar la API REST para nuevo modelo.
**Entregables:**
- Actualizar `src/infrastructure/driver/http/schemas/book.schemas.ts`
- Actualizar `src/infrastructure/driver/http/controllers/BooksController.ts`
- Actualizar tests E2E HTTP

---

### TASK-012: Eliminar CLI
**Descripción:** Remover completamente el adaptador CLI.
**Entregables:**
- Eliminar `src/infrastructure/driver/cli/` (todo el directorio)
- Eliminar `src/cli.ts`
- Eliminar `tests/unit/infrastructure/driver/cli/`
- Eliminar `tests/e2e/cli/`
- Actualizar `package.json` (eliminar scripts CLI)
- Actualizar documentación si hay referencias

---

### TASK-013: Crear script de consolidación JSON
**Descripción:** Script que procesa ficheros origen y genera JSON consolidado.
**Entregables:**
- `apps/api-cli/scripts/consolidate-books.ts`
- Script npm en `package.json`: `"consolidate:books"`
- Tests para el script

---

### TASK-014: Crear script de carga de datos (seed)
**Descripción:** Script que carga datos desde JSON a BD usando el caso de uso.
**Entregables:**
- `apps/api-cli/scripts/seed-database.ts`
- Script npm en `package.json`: `"seed:database"`
- Lógica de idempotencia (skip si ya existe)
- Tests para el script

---

### TASK-015: Integrar carga automática en Docker
**Descripción:** Ejecutar seed automáticamente al iniciar si BD vacía.
**Entregables:**
- Actualizar `apps/api-cli/docker/entrypoint.dev.sh`
- Variable de entorno `AUTO_SEED`
- Documentar en README

---

### TASK-016: Actualizar documentación
**Descripción:** Actualizar todos los documentos afectados.
**Entregables:**
- Actualizar `docs/design_docs/01-project-overview.md` (modelo de dominio)
- Actualizar `docs/design_docs/02-project-structure.md` (eliminar refs CLI)
- Actualizar `docs/design_docs/03-hu-001-create-book.md` (nuevo modelo)
- Actualizar `docs/api/openapi.yaml` (nuevo schema)
- Actualizar `README.md` con instrucciones de carga de datos

---

## 12. Diagrama de Flujo: Carga de Datos

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FASE 1: CONSOLIDACIÓN                             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Leer todos los *.json de data/source/                            │
│    - file1.json, file2.json, file3.json...                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Por cada fichero (orden alfabético):                             │
│    - Parsear JSON                                                    │
│    - Por cada libro:                                                 │
│      - Si ISBN no visto → Añadir a mapa                             │
│      - Si ISBN ya visto → Ignorar (duplicado)                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Transformar estructura:                                           │
│    - id → isbn                                                       │
│    - tags → categories                                               │
│    - Añadir type: "technical"                                        │
│    - Añadir format: "pdf"                                            │
│    - Añadir available: false                                         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Escribir docs/db/books.json                                       │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    FASE 2: CARGA EN BD                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Leer docs/db/books.json                                           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Por cada libro:                                                   │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ ¿Existe en BD (por ISBN)?                                    │  │
│    │   - SÍ → Skip (log info)                                     │  │
│    │   - NO → Continuar                                           │  │
│    └─────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ Para cada autor en authors[]:                                │  │
│    │   - AuthorRepository.findOrCreate(name)                      │  │
│    └─────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ Obtener tipo:                                                │  │
│    │   - TypeRepository.findByName(type)                          │  │
│    └─────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ Llamar CreateBookUseCase.execute({...})                      │  │
│    │   - Crea categorías si no existen                            │  │
│    │   - Genera embedding                                          │  │
│    │   - Persiste libro con relaciones                            │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Mostrar resumen:                                                  │
│    - Total procesados: X                                             │
│    - Creados: Y                                                      │
│    - Saltados (ya existían): Z                                       │
│    - Errores: W                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 13. Consideraciones Técnicas

### 13.1 Idempotencia del Script de Carga

El script debe ser seguro de ejecutar múltiples veces:

```typescript
async function seedBook(bookData: BookInput): Promise<'created' | 'skipped' | 'error'> {
  // Check if book already exists
  const existing = await bookRepository.findByIsbn(bookData.isbn);
  if (existing) {
    logger.info(`Book already exists: ${bookData.isbn}`);
    return 'skipped';
  }
  
  try {
    await createBookUseCase.execute(bookData);
    return 'created';
  } catch (error) {
    logger.error(`Failed to create book: ${bookData.isbn}`, error);
    return 'error';
  }
}
```

### 13.2 Manejo de Errores del Servicio de Embeddings

Si Ollama no está disponible durante la carga:
- Se reintenta hasta 3 veces con backoff exponencial
- Si falla definitivamente, se registra el error y se continúa con el siguiente libro
- Al final se muestra un resumen de libros que no pudieron cargarse

### 13.3 Rendimiento

Para cargas grandes (>1000 libros):
- Se procesan en lotes de 50 libros
- Se usa una única transacción por lote
- Se muestra progreso: `Processing batch 3/20...`

---

## 14. Definición de Hecho (DoD)

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Tests unitarios para nuevas entidades (Author, BookType)
- [ ] Tests de integración para nuevos repositorios
- [ ] Tests E2E actualizados (sin CLI)
- [ ] Script de consolidación funcionando
- [ ] Script de carga funcionando y es idempotente
- [ ] API actualizada para múltiples autores
- [ ] Documentación actualizada (design docs, OpenAPI)
- [ ] CLI completamente eliminado
- [ ] Docker compose actualizado con nueva ruta de init-db.sql
- [ ] 0 lint errors, 0 type errors, all tests green, build success

---

## 15. Referencias

- [01-project-overview.md](./01-project-overview.md) - Stack tecnológico
- [02-project-structure.md](./02-project-structure.md) - Arquitectura hexagonal
- [03-hu-001-create-book.md](./03-hu-001-create-book.md) - Caso de uso base
