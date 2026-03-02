# Design Doc: API (Backend)

## 1. Resumen Ejecutivo

Este documento define la arquitectura y diseño del backend API para el sistema Library. La API es una aplicación Node.js/Fastify que implementa la lógica de negocio principal del sistema de gestión de biblioteca digital.

### 1.1 Objetivos

- Proporcionar una API REST para gestión de libros digitales
- Implementar búsqueda semántica mediante embeddings vectoriales (pgvector)
- Traducir automáticamente descripciones de libros al español
- Mantener una arquitectura limpia siguiendo principios DDD y Hexagonal Architecture

### 1.2 Alcance

**Incluido:**

- Creación de libros con generación automática de embeddings
- Búsqueda de libros con filtros múltiples y búsqueda semántica
- Traducción automática de descripciones (inglés → español)
- Gestión de tipos, categorías y niveles de dificultad
- Paginación cursor-based

**Excluido:**

- Autenticación/autorización de usuarios
- Actualización y eliminación de libros
- Gestión de archivos físicos (upload/download)
- Envío a Kindle (futuro)

---

## 2. Arquitectura

### 2.1 Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Runtime | Node.js | 20+ |
| Framework | Fastify | 4.x |
| Lenguaje | TypeScript (ESM) | 5.x |
| Base de Datos | PostgreSQL + pgvector | 16+ |
| ORM | Drizzle ORM | Latest |
| Validación | Zod | Latest |
| Testing | Vitest | Latest |
| Logging | Pino | Latest |
| Embeddings | Ollama Embeddings (nomic-embed-text) | Latest |
| Traducción | Ollama Translations (llama3.2:1b) | Latest |

### 2.2 Arquitectura Hexagonal (Ports & Adapters)

La API sigue una arquitectura hexagonal estricta con tres capas principales:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    DRIVER ADAPTERS (Input)                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │ HTTP Server │  │ Controllers │  │ Zod Schemas (Validation)│  │    │
│  │  │  (Fastify)  │  │   (Routes)  │  │                         │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │    │
│  └─────────┼────────────────┼─────────────────────┼────────────────┘    │
│            │                │                     │                      │
│            ▼                ▼                     ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      APPLICATION LAYER                           │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │                      USE CASES                           │    │    │
│  │  │  CreateBookUseCase  │  SearchBooksUseCase  │  List*...  │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │                    PORTS (Interfaces)                    │    │    │
│  │  │  BookRepository │ EmbeddingService │ TranslationService │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│            │                │                     │                      │
│            ▼                ▼                     ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    DRIVEN ADAPTERS (Output)                      │    │
│  │  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐   │    │
│  │  │ Postgres      │  │ Ollama Embedd.  │  │ Ollama           │   │    │
│  │  │ Repositories  │  │ Service         │  │ Translations     │   │    │
│  │  │ (Drizzle)     │  │                 │  │ Service          │   │    │
│  │  └───────────────┘  └─────────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      DOMAIN LAYER (Core)                         │    │
│  │  ┌──────────────┐  ┌───────────────┐  ┌───────────────────┐     │    │
│  │  │   Entities   │  │ Value Objects │  │  Criteria Pattern │     │    │
│  │  │ Book, Author │  │ ISBN, Format  │  │  Filters, Order   │     │    │
│  │  │ Category...  │  │               │  │                   │     │    │
│  │  └──────────────┘  └───────────────┘  └───────────────────┘     │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │                    Domain Errors                          │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Estructura de Directorios

```
apps/api/
├── src/
│   ├── domain/                    # Capa de Dominio (sin dependencias)
│   │   ├── entities/              # Entidades de dominio
│   │   │   ├── Book.ts
│   │   │   ├── Author.ts
│   │   │   ├── BookType.ts
│   │   │   ├── Category.ts
│   │   │   └── Level.ts
│   │   ├── value-objects/         # Value Objects
│   │   │   ├── ISBN.ts
│   │   │   └── BookFormat.ts
│   │   ├── criteria/              # Patrón Criteria para queries
│   │   │   ├── Criteria.ts
│   │   │   ├── Filter.ts
│   │   │   ├── Filters.ts
│   │   │   └── Order.ts
│   │   ├── errors/                # Errores de dominio
│   │   │   └── DomainErrors.ts
│   │   └── validators/            # Validadores puros
│   │       └── uuid.ts
│   │
│   ├── application/               # Capa de Aplicación
│   │   ├── use-cases/             # Casos de uso
│   │   │   ├── CreateBookUseCase.ts
│   │   │   ├── SearchBooksUseCase.ts
│   │   │   ├── ListBookTypesUseCase.ts
│   │   │   ├── ListCategoriesUseCase.ts
│   │   │   └── ListBookLevelsUseCase.ts
│   │   ├── ports/                 # Interfaces (contratos)
│   │   │   ├── BookRepository.ts
│   │   │   ├── AuthorRepository.ts
│   │   │   ├── TypeRepository.ts
│   │   │   ├── CategoryRepository.ts
│   │   │   ├── LevelRepository.ts
│   │   │   ├── EmbeddingService.ts
│   │   │   ├── TranslationService.ts
│   │   │   └── Logger.ts
│   │   └── errors/                # Errores de aplicación
│   │       └── ApplicationErrors.ts
│   │
│   ├── infrastructure/            # Capa de Infraestructura
│   │   ├── config/                # Configuración
│   │   │   └── env.ts
│   │   ├── driven/                # Adaptadores de salida
│   │   │   ├── persistence/       # Repositorios PostgreSQL
│   │   │   │   ├── drizzle/       # Schema y migrations
│   │   │   │   ├── mappers/       # Entity ↔ DB mappers
│   │   │   │   └── Postgres*Repository.ts
│   │   │   ├── embedding/         # Servicio de embeddings
│   │   │   │   └── OllamaEmbeddingService.ts
│   │   │   ├── translation/       # Servicio de traducción
│   │   │   │   └── OllamaTranslationService.ts
│   │   │   └── logging/           # Logger
│   │   │       └── PinoLogger.ts
│   │   └── driver/                # Adaptadores de entrada
│   │       └── http/
│   │           ├── server.ts
│   │           ├── controllers/   # Controladores HTTP
│   │           ├── routes/        # Definición de rutas
│   │           ├── schemas/       # Zod schemas
│   │           └── errors/        # Error handlers
│   │
│   └── shared/                    # Utilidades compartidas
│       └── utils/
│
├── tests/
│   ├── unit/                      # Tests unitarios
│   ├── integration/               # Tests de integración
│   └── e2e/                       # Tests end-to-end
│
├── drizzle/                       # Migraciones de base de datos
└── scripts/                       # Scripts de utilidad
    ├── seed-database.ts
    └── consolidate-books.ts
```

---

## 3. API Endpoints

### 3.1 Resumen de Endpoints

| Método | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/api/books` | Buscar libros con filtros | ✅ |
| POST | `/api/books` | Crear nuevo libro | ✅ |
| GET | `/api/book-types` | Listar tipos de libro | ✅ |
| GET | `/api/book-categories` | Listar categorías | ✅ |
| GET | `/api/book-levels` | Listar niveles | ✅ |

### 3.2 GET /api/books - Buscar Libros

Busca libros con múltiples filtros combinados con lógica AND y paginación cursor-based.

#### Parámetros de Query

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `isbn` | string | Búsqueda exacta por ISBN |
| `title` | string | Búsqueda parcial en título (case-insensitive) |
| `author` | string | Búsqueda parcial en autor (case-insensitive) |
| `types` | string[] | Filtro por tipos (OR entre valores) |
| `categories` | string[] | Filtro por categorías (OR entre valores) |
| `levels` | string[] | Filtro por niveles (OR entre valores) |
| `text` | string | Búsqueda semántica (≥70% similaridad) |
| `limit` | number | Resultados por página (1-100, default: 50) |
| `cursor` | string | Token de paginación |

#### Ordenamiento

- **Sin filtro `text`**: Ordenado por título (A-Z)
- **Con filtro `text`**: Ordenado por similaridad (descendente)

#### Response (200 OK)

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
          { "id": "uuid", "name": "Robert C. Martin" }
        ],
        "type": "technical",
        "categories": [
          { "id": "uuid", "name": "programming" }
        ],
        "level": "Intermediate",
        "format": "pdf",
        "originalDescription": "A handbook of agile software craftsmanship",
        "description": "Un manual de artesanía de software ágil",
        "language": "en",
        "similarityScore": 0.87
      }
    ],
    "pagination": {
      "limit": 50,
      "hasNextPage": false,
      "nextCursor": null,
      "totalCount": 1
    }
  },
  "error": null
}
```

### 3.3 POST /api/books - Crear Libro

Crea un nuevo libro generando automáticamente:

1. Embedding vectorial (768 dimensiones) para búsqueda semántica
2. Traducción al español de la descripción (si el idioma original no es español)

#### Request Body

```json
{
  "title": "Clean Code",
  "authors": ["Robert C. Martin"],
  "description": "A handbook of agile software craftsmanship",
  "language": "en",
  "type": "technical",
  "format": "pdf",
  "categories": ["programming", "software engineering"],
  "level": "Intermediate",
  "isbn": "9780132350884",
  "available": true,
  "path": "/books/clean-code.pdf"
}
```

#### Campos Requeridos

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `title` | string | 1-500 caracteres |
| `authors` | string[] | 1-20 autores, 1-200 chars cada uno |
| `description` | string | 1-5000 caracteres |
| `language` | string | ISO 639-1 (2 letras, e.g., "en", "es") |
| `type` | enum | technical, novel, essay, poetry, biography, reference, manual, other |
| `format` | enum | pdf, epub, mobi, azw3 |
| `categories` | string[] | 1-10 categorías |

#### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `level` | string | Nivel de dificultad (debe existir para el tipo) |
| `isbn` | string | ISBN-10 o ISBN-13 válido |
| `available` | boolean | Default: true |
| `path` | string | Ruta al archivo físico |

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Clean Code",
    "authors": [
      { "id": "uuid", "name": "Robert C. Martin" }
    ],
    "originalDescription": "A handbook of agile software craftsmanship",
    "description": "Un manual de artesanía de software ágil",
    "language": "en",
    "type": "technical",
    "format": "pdf",
    "level": "Intermediate",
    "categories": [
      { "id": "uuid", "name": "programming" }
    ],
    "isbn": "9780132350884",
    "available": true,
    "path": "/books/clean-code.pdf",
    "createdAt": "2026-02-09T12:00:00.000Z",
    "updatedAt": "2026-02-09T12:00:00.000Z"
  },
  "error": null
}
```

### 3.4 GET /api/book-types - Listar Tipos

Lista todos los tipos de libro disponibles.

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "technical",
      "description": "Technical and programming books"
    }
  ],
  "error": null
}
```

### 3.5 GET /api/book-categories - Listar Categorías

Lista categorías, opcionalmente filtradas por tipo.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `typeId` | string | Filtrar por tipo de libro (opcional) |

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "programming",
      "typeId": "uuid",
      "typeName": "technical"
    }
  ],
  "error": null
}
```

### 3.6 GET /api/book-levels - Listar Niveles

Lista niveles de dificultad, opcionalmente filtrados por tipo.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `typeId` | string | Filtrar por tipo de libro (opcional) |

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Beginner",
      "typeId": "uuid",
      "typeName": "technical"
    }
  ],
  "error": null
}
```

---

## 4. Modelo de Dominio

### 4.1 Entidades

#### Book (Aggregate Root)

```typescript
class Book {
  readonly id: string;                    // UUID
  readonly title: string;                 // 1-500 chars
  readonly authors: Author[];             // 1-20 authors
  readonly originalDescription: string;  // Description in original language
  readonly description: string;           // Spanish description
  readonly language: string;              // ISO 639-1 code
  readonly type: BookType;
  readonly categories: Category[];        // 1-10 categories
  readonly level: Level | null;
  readonly format: BookFormat;            // Value Object
  readonly isbn: ISBN | null;             // Value Object
  readonly available: boolean;
  readonly path: string | null;
  readonly embedding: number[];           // 768 dimensions
  readonly createdAt: Date;
  readonly updatedAt: Date;

  // Factory methods
  static create(props: CreateBookProps): Book;
  static fromPersistence(data: BookData): Book;
}
```

#### Author

```typescript
class Author {
  readonly id: string;
  readonly name: string;  // 1-200 chars

  static create(props: { id?: string; name: string }): Author;
  static fromPersistence(data: AuthorData): Author;
}
```

#### BookType

```typescript
class BookType {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;

  static fromPersistence(data: BookTypeData): BookType;
}
```

#### Category

```typescript
class Category {
  readonly id: string;
  readonly name: string;
  readonly typeId: string;

  static create(props: CreateCategoryProps): Category;
  static fromPersistence(data: CategoryData): Category;
}
```

#### Level

```typescript
class Level {
  readonly id: string;
  readonly name: string;
  readonly typeId: string;

  static fromPersistence(data: LevelData): Level;
}
```

### 4.2 Value Objects

#### ISBN

```typescript
class ISBN {
  readonly value: string;  // Normalized (no hyphens)

  private constructor(value: string);
  static create(value: string): ISBN;  // Validates format + checksum
  
  get isbn10(): string | null;
  get isbn13(): string;
}
```

Validaciones:

- ISBN-10: 10 dígitos, último puede ser 'X'
- ISBN-13: 13 dígitos, empieza con 978 o 979
- Checksum válido

#### BookFormat

```typescript
class BookFormat {
  readonly value: 'pdf' | 'epub' | 'mobi' | 'azw3';

  private constructor(value: string);
  static create(value: string): BookFormat;
}
```

### 4.3 Patrón Criteria (Query Builder)

El patrón Criteria encapsula la lógica de búsqueda de forma agnóstica a la infraestructura:

```typescript
// Criteria
class Criteria {
  readonly filters: Filters;
  readonly order: Order | null;
  readonly limit: number;
  readonly cursor: string | null;

  static create(options: CriteriaOptions): Criteria;
  withFilters(filters: Filter[]): Criteria;
  withOrder(order: Order): Criteria;
  hasSimilarityFilter(): boolean;
}

// Filter
class Filter {
  readonly field: FilterField;
  readonly operator: FilterOperator;
  readonly value: FilterValue;

  static equals(field: string, value: string): Filter;
  static contains(field: string, value: string): Filter;
  static in(field: string, values: string[]): Filter;
  static similarTo(field: string, text: string): Filter;
}

// Order
class Order {
  readonly orderBy: OrderBy;
  readonly orderType: OrderType;

  static asc(field: string): Order;
  static desc(field: string): Order;
}
```

### 4.4 Errores de Dominio

```typescript
// Base class
abstract class DomainError extends Error { }

// Validation errors
class RequiredFieldError extends DomainError { }
class FieldTooLongError extends DomainError { }
class InvalidUUIDError extends DomainError { }
class TooManyItemsError extends DomainError { }
class DuplicateItemError extends DomainError { }

// Business rule errors
class BookNotFoundError extends DomainError { }
class DuplicateISBNError extends DomainError { }
class DuplicateBookError extends DomainError { }
class InvalidBookTypeError extends DomainError { }
class CategoryTypeMismatchError extends DomainError { }
class LevelTypeMismatchError extends DomainError { }
class InvalidLanguageCodeError extends DomainError { }

// Data constraint errors
class EmbeddingTextTooLongError extends DomainError { }
```

---

## 5. Capa de Aplicación

### 5.1 Use Cases

#### CreateBookUseCase

Orquesta la creación de un libro:

```
1. Validar datos de entrada
2. Obtener/validar BookType
3. Obtener/validar Level (si aplica, debe pertenecer al tipo)
4. Obtener/crear categorías (validar que pertenecen al tipo)
5. Obtener/crear autores
6. Traducir descripción al español (si no es español)
7. Generar embedding del contenido
8. Crear entidad Book
9. Persistir en base de datos
10. Retornar libro creado
```

#### SearchBooksUseCase

Orquesta la búsqueda de libros:

```
1. Validar parámetros de entrada
2. Generar embedding si hay filtro de texto (búsqueda semántica)
3. Construir Criteria con filtros
4. Ejecutar búsqueda en repositorio
5. Mapear resultados a DTOs
6. Retornar resultados paginados
```

#### ListBookTypesUseCase

Lista todos los tipos de libro disponibles.

#### ListCategoriesUseCase

Lista categorías, opcionalmente filtradas por tipo.

#### ListBookLevelsUseCase

Lista niveles, opcionalmente filtrados por tipo.

### 5.2 Ports (Interfaces)

#### BookRepository

```typescript
interface BookRepository {
  save(book: Book): Promise<void>;
  findById(id: string): Promise<Book | null>;
  findByISBN(isbn: ISBN): Promise<Book | null>;
  search(criteria: Criteria, embedding?: number[]): Promise<SearchBooksResult>;
  existsByAuthorTitleFormat(author: string, title: string, format: string): Promise<boolean>;
}

interface SearchBooksResult {
  items: SearchResultItem[];
  hasNextPage: boolean;
  nextCursor: string | null;
  totalCount: number;
}
```

#### AuthorRepository

```typescript
interface AuthorRepository {
  findByName(name: string): Promise<Author | null>;
  findByNames(names: string[]): Promise<Author[]>;
  save(author: Author): Promise<void>;
}
```

#### TypeRepository

```typescript
interface TypeRepository {
  findAll(): Promise<BookType[]>;
  findByName(name: string): Promise<BookType | null>;
  findById(id: string): Promise<BookType | null>;
}
```

#### CategoryRepository

```typescript
interface CategoryRepository {
  findByName(name: string): Promise<Category | null>;
  findByNames(names: string[]): Promise<Category[]>;
  findByTypeId(typeId: string): Promise<Category[]>;
  findAll(): Promise<Category[]>;
  save(category: Category): Promise<void>;
}
```

#### LevelRepository

```typescript
interface LevelRepository {
  findByName(name: string): Promise<Level | null>;
  findByTypeId(typeId: string): Promise<Level[]>;
  findAll(): Promise<Level[]>;
}
```

#### EmbeddingService

```typescript
interface EmbeddingService {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}
```

#### TranslationService

```typescript
interface TranslationService {
  translateToSpanish(text: string, sourceLanguage: string): Promise<TranslationResult>;
}

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}
```

#### Logger

```typescript
interface Logger {
  debug(message: string, context?: object): void;
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, context?: object): void;
  child(bindings: object): Logger;
}
```

### 5.3 Errores de Aplicación

```typescript
// Embedding service errors
abstract class EmbeddingServiceError extends Error { }
class EmbeddingServiceUnavailableError extends EmbeddingServiceError { }

// Translation service errors
abstract class TranslationServiceError extends Error { }
class TranslationServiceUnavailableError extends TranslationServiceError { }
class TranslationError extends TranslationServiceError { }
```

---

## 6. Capa de Infraestructura

### 6.1 Driven Adapters (Output)

#### PostgreSQL Repositories

Implementan los puertos de repositorio usando Drizzle ORM:

- **PostgresBookRepository**: Búsqueda con pgvector, filtros, paginación cursor-based
- **PostgresAuthorRepository**: CRUD de autores con búsqueda case-insensitive
- **PostgresTypeRepository**: Consulta de tipos (solo lectura)
- **PostgresCategoryRepository**: CRUD de categorías con filtro por tipo
- **PostgresLevelRepository**: Consulta de niveles con filtro por tipo

**Características:**

- Transacciones para operaciones compuestas
- Búsqueda vectorial con pgvector (`<=>` cosine distance)
- Paginación cursor-based eficiente
- Mappers para convertir DB rows ↔ Domain entities

#### OllamaEmbeddingService

```typescript
class OllamaEmbeddingService implements EmbeddingService {
  // Configuración
  baseUrl: string;           // Default: http://ollama-embeddings:11434
  model: string;             // Default: nomic-embed-text
  timeoutMs: number;         // Default: 30000
  maxTextLength: number;     // 7000 chars

  async generateEmbedding(text: string): Promise<EmbeddingResult>;
}
```

**Características:**

- Genera embeddings de 768 dimensiones
- Validación de longitud máxima (7000 chars)
- Retry con backoff exponencial
- Errores específicos: `EmbeddingServiceUnavailableError`

#### OllamaTranslationService

```typescript
class OllamaTranslationService implements TranslationService {
  // Configuración
  baseUrl: string;           // Default: http://ollama-translations:11434
  model: string;             // Default: llama3.2:1b
  timeoutMs: number;         // Default: 60000
  retries: number;           // Default: 3

  async translateToSpanish(text: string, sourceLanguage: string): Promise<TranslationResult>;
}
```

**Características:**

- Traduce cualquier idioma al español
- Si ya está en español, devuelve el texto original
- Retry con backoff exponencial
- Errores específicos: `TranslationServiceUnavailableError`, `TranslationError`

#### PinoLogger

Logger estructurado con niveles configurables y contexto.

### 6.2 Driver Adapters (Input)

#### HTTP Server (Fastify)

```typescript
// server.ts
const server = Fastify({
  logger: pinoLogger,
});

// Plugins
server.register(cors);
server.register(fastifySwagger);

// Routes
server.register(bookRoutes, { prefix: '/api' });
server.register(typeRoutes, { prefix: '/api' });
server.register(categoryRoutes, { prefix: '/api' });
server.register(levelRoutes, { prefix: '/api' });
```

#### Controllers

Cada controller:

1. Recibe la request HTTP
2. Valida con Zod schema
3. Ejecuta el use case correspondiente
4. Mapea errores a respuestas HTTP
5. Retorna respuesta estandarizada

#### Zod Schemas

Validación de entrada con mensajes de error claros:

```typescript
const createBookSchema = z.object({
  title: z.string().min(1).max(500),
  authors: z.array(z.string().min(1).max(200)).min(1).max(20),
  description: z.string().min(1).max(5000),
  language: z.string().length(2).regex(/^[a-z]{2}$/),
  type: z.enum(['technical', 'novel', 'essay', ...]),
  format: z.enum(['pdf', 'epub', 'mobi', 'azw3']),
  categories: z.array(z.string()).min(1).max(10),
  level: z.string().optional(),
  isbn: z.string().optional(),
  available: z.boolean().optional().default(true),
  path: z.string().optional(),
});
```

### 6.3 Configuración (env.ts)

```typescript
interface EnvConfig {
  app: {
    nodeEnv: string;      // NODE_ENV (development)
    port: number;         // PORT (3000)
    logLevel: string;     // LOG_LEVEL (debug)
  };
  database: {
    url: string;          // DATABASE_URL (required)
  };
  ollama: {
    baseUrl: string;      // OLLAMA_BASE_URL (http://ollama:11434)
    model: string;        // OLLAMA_MODEL (nomic-embed-text)
    timeoutMs: number;    // OLLAMA_TIMEOUT_MS (30000)
  };
  translation: {
    baseUrl: string;      // Same as ollama.baseUrl
    model: string;        // TRANSLATION_MODEL (llama3.2:1b)
    timeoutMs: number;    // TRANSLATION_TIMEOUT_MS (60000)
    retries: number;      // TRANSLATION_RETRIES (3)
  };
}
```

---

## 7. Flujos Principales

### 7.1 Flujo de Creación de Libro

```
┌────────┐     ┌──────────────┐     ┌─────────────────┐
│ Client │────▶│ POST /books  │────▶│ Zod Validation  │
└────────┘     └──────────────┘     └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ BookController  │
                                    └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │ CreateBookUseCase   │
                                    └────────┬────────────┘
                                              │
               ┌──────────────────────────────┼──────────────────────────────┐
               │                              │                              │
               ▼                              ▼                              ▼
     ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
     │ TypeRepository  │           │ LevelRepository │           │CategoryRepository│
     │ findByName()    │           │ findByName()    │           │ findByNames()   │
     └────────┬────────┘           └────────┬────────┘           └────────┬────────┘
               │                              │                              │
               └──────────────────────────────┼──────────────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ AuthorRepository│
                                    │ findByNames()   │
                                    │ + save() new    │
                                    └────────┬────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │ TranslationService   │
                                   │ translateToSpanish() │
                                   │ (if language != 'es')│
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │ EmbeddingService     │
                                   │ generateEmbedding()  │
                                   │ (768 dimensions)     │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Book.create()   │
                                    │ Domain Entity   │
                                    └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ BookRepository  │
                                    │ save()          │
                                    └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Response 201    │
                                    │ Created Book    │
                                    └─────────────────┘
```

### 7.2 Flujo de Búsqueda de Libros (Semántica)

```
┌────────┐     ┌──────────────────────────┐
│ Client │────▶│ GET /books?text=software │
└────────┘     │     architecture         │
               └────────────┬─────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │ Zod Validation  │
                  └────────┬────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │ SearchBooksUseCase  │
                  └────────┬────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │ Has text filter?                     │
         │ Yes ─────────────────────────────────┤
         ▼                                      │
┌─────────────────────┐                         │
│ EmbeddingService    │                         │
│ generateEmbedding() │                         │
│ (query → 768 dims)  │                         │
└──────────┬──────────┘                         │
           │                                    │
           └──────────────────┬─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Build Criteria  │
                    │ - Filters       │
                    │ - Order         │
                    │ - Pagination    │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ BookRepository      │
                    │ search(criteria,    │
                    │        embedding)   │
                    └────────┬────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ PostgreSQL + pgvector│
                    │ - Apply filters     │
                    │ - Cosine similarity │
                    │ - Threshold ≥ 0.70  │
                    │ - Sort by similarity│
                    └────────┬────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Map to DTOs     │
                    │ + similarityScore│
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Response 200    │
                    │ Paginated results│
                    └─────────────────┘
```

---

## 8. Manejo de Errores

### 8.1 Jerarquía de Errores

```
Error
├── DomainError (business rules)
│   ├── RequiredFieldError         → 400
│   ├── FieldTooLongError          → 400
│   ├── InvalidUUIDError           → 400
│   ├── TooManyItemsError          → 400
│   ├── DuplicateItemError         → 400
│   ├── BookNotFoundError          → 404
│   ├── DuplicateISBNError         → 409
│   ├── DuplicateBookError         → 409
│   ├── InvalidBookTypeError       → 400
│   ├── CategoryTypeMismatchError  → 400
│   ├── LevelTypeMismatchError     → 400
│   ├── InvalidLanguageCodeError   → 400
│   └── EmbeddingTextTooLongError  → 400
│
├── EmbeddingServiceError (infrastructure)
│   └── EmbeddingServiceUnavailableError → 503
│
└── TranslationServiceError (infrastructure)
    ├── TranslationServiceUnavailableError → 503
    └── TranslationError                   → 500
```

### 8.2 Formato de Respuesta de Error

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Category \"programming\" belongs to type \"technical\" but book type is \"novel\"",
    "details": []
  }
}
```

Para errores de validación Zod:

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Validation failed",
    "details": [
      "title: String must contain at least 1 character(s)",
      "authors: Array must contain at least 1 element(s)"
    ]
  }
}
```

---

## 9. Formato de Respuesta API

Todas las respuestas siguen un formato estandarizado:

### Success Response

```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}
```

### Error Response

```typescript
interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    message: string;
    details?: string[];
  };
}
```

---

## 10. Base de Datos

### 10.1 Schema Principal

```sql
-- Types (seeded)
CREATE TABLE types (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type_id UUID REFERENCES types(id),
  UNIQUE(name, type_id)
);

-- Levels
CREATE TABLE levels (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  type_id UUID REFERENCES types(id),
  UNIQUE(name, type_id)
);

-- Authors
CREATE TABLE authors (
  id UUID PRIMARY KEY,
  name VARCHAR(200) UNIQUE NOT NULL
);

-- Books
CREATE TABLE books (
  id UUID PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  original_description TEXT NOT NULL,
  description TEXT NOT NULL,
  language CHAR(2) NOT NULL,
  type_id UUID REFERENCES types(id) NOT NULL,
  level_id UUID REFERENCES levels(id),
  format VARCHAR(10) NOT NULL,
  isbn VARCHAR(13) UNIQUE,
  available BOOLEAN DEFAULT true,
  path TEXT,
  embedding VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book-Author relationship
CREATE TABLE book_authors (
  book_id UUID REFERENCES books(id),
  author_id UUID REFERENCES authors(id),
  PRIMARY KEY (book_id, author_id)
);

-- Book-Category relationship
CREATE TABLE book_categories (
  book_id UUID REFERENCES books(id),
  category_id UUID REFERENCES categories(id),
  PRIMARY KEY (book_id, category_id)
);

-- Indexes for search performance
CREATE INDEX idx_books_embedding ON books USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_books_title ON books (title);
CREATE INDEX idx_books_type ON books (type_id);
CREATE INDEX idx_books_level ON books (level_id);
```

### 10.2 Búsqueda Vectorial

pgvector permite búsqueda semántica eficiente:

```sql
-- Búsqueda por similaridad (cosine distance)
SELECT *, 1 - (embedding <=> $1) as similarity
FROM books
WHERE 1 - (embedding <=> $1) >= 0.70
ORDER BY embedding <=> $1
LIMIT 50;
```

---

## 11. Testing

### 11.1 Estrategia

| Nivel | Herramienta | Cobertura | Responsabilidad |
|-------|-------------|-----------|-----------------|
| Unit | Vitest | 100% domain | Entidades, Value Objects, Criteria |
| Unit | Vitest | 100% use cases | Lógica de aplicación con mocks |
| Integration | Vitest | 80%+ | Repositorios con DB real, Ollama |
| E2E | Vitest | Flujos críticos | API HTTP completa |

### 11.2 Test Counts Esperados

- **Unit**: ~345 tests
- **Integration**: ~63 tests
- **E2E**: ~30 tests (+ 2 skipped para escenarios 503)

### 11.3 Comandos de Test

```bash
# En Docker (recomendado)
docker exec library-api-dev npm test              # Unitarios
docker exec library-api-dev npm run test:integration
docker exec library-api-dev npm run test:e2e
docker exec library-api-dev npm run test:coverage
```

---

## 12. Docker

### 12.1 Servicios

```yaml
services:
  api:
    build: ./apps/api
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - ollama
    environment:
      - DATABASE_URL=postgresql://...
      - OLLAMA_BASE_URL=http://ollama:11434

  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
```

### 12.2 Modelos Ollama Requeridos

```bash
# Embeddings (768 dimensiones)
ollama pull nomic-embed-text

# Traducción
ollama pull llama3.2:1b
```

---

## 13. Decisiones de Diseño

### 13.1 ¿Por qué Hexagonal Architecture?

- **Testabilidad**: Dominio puro sin dependencias externas
- **Flexibilidad**: Cambiar infraestructura sin tocar lógica de negocio
- **Claridad**: Separación clara de responsabilidades

### 13.2 ¿Por qué pgvector?

- **Integración nativa**: Embeddings en la misma DB que los datos
- **Performance**: Índices especializados (IVFFlat, HNSW)
- **Simplicidad**: Sin necesidad de base de datos vectorial separada

### 13.3 ¿Por qué cursor-based pagination?

- **Eficiencia**: No requiere COUNT(*) ni OFFSET
- **Consistencia**: Resultados estables si hay inserciones/eliminaciones
- **Escalabilidad**: Rendimiento constante independiente de la página

### 13.4 ¿Por qué traducción automática?

- **UX**: Usuarios hispanohablantes ven descripciones en español
- **Búsqueda**: Embeddings generados del texto español para consistencia
- **Fallback**: Si falla traducción, se usa descripción original

### 13.5 ¿Por qué Fastify sobre Express?

- **Performance**: 2-3x más rápido que Express
- **TypeScript**: Mejor soporte nativo
- **Validación**: Integración natural con Zod
- **Moderno**: Diseñado para async/await desde el inicio

---

## 14. Referencias

- [Fastify Documentation](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [pgvector](https://github.com/pgvector/pgvector)
- [Ollama API](https://ollama.ai/docs/api)
- [Zod](https://zod.dev/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [DDD Reference](https://www.domainlanguage.com/ddd/reference/)
