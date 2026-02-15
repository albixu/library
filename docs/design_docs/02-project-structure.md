# Design Doc: Estructura del Proyecto - Arquitectura Hexagonal

## Metadata

| Campo | Valor |
|-------|-------|
| **Estado** | Aprobado |
| **Fecha** | 2026-01-31 |
| **Autor** | - |

---

## 1. Introducción

Este documento describe la estructura de carpetas y archivos del proyecto **Library**, explicando el propósito de cada componente y cómo se relacionan entre sí siguiendo los principios de la **Arquitectura Hexagonal** (también conocida como **Ports & Adapters**).

---

## 2. ¿Por qué Arquitectura Hexagonal?

### 2.1 El Problema que Resuelve

En arquitecturas tradicionales (MVC, capas), el dominio de negocio suele estar acoplado a:
- Frameworks web específicos
- Bases de datos concretas
- Servicios externos

Esto genera código difícil de testear, mantener y evolucionar.

### 2.2 La Solución: Ports & Adapters

La Arquitectura Hexagonal propone:

1. **El dominio es el centro**: La lógica de negocio no conoce ni depende de nada externo
2. **Ports (Puertos)**: Interfaces que definen cómo el dominio se comunica con el exterior
3. **Adapters (Adaptadores)**: Implementaciones concretas de los puertos

```
                    ┌─────────────────────────────────────┐
                    │           ADAPTERS                  │
                    │  (CLI, HTTP API, PostgreSQL, etc.)  │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │             PORTS                   │
                    │  (Interfaces/Contratos)             │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │            DOMAIN                   │
                    │  (Entidades, Value Objects,         │
                    │   Reglas de Negocio)                │
                    └─────────────────────────────────────┘
```

### 2.3 Beneficios para este Proyecto

| Beneficio | Aplicación en Library |
|-----------|----------------------|
| **Testabilidad** | Podemos testear el dominio sin base de datos ni Ollama |
| **Flexibilidad** | Cambiar de PostgreSQL a otro motor solo requiere un nuevo adapter |
| **API REST** | La API es simplemente un adapter del dominio |
| **Embeddings intercambiables** | Ollama hoy, HuggingFace mañana, sin tocar el dominio |

---

## 3. Estructura de Carpetas

El proyecto sigue una estructura **monorepo** con múltiples aplicaciones bajo el directorio `apps/`:

```
library/
├── docs/
│   ├── api/
│   │   └── openapi.yaml
│   ├── db/
│   │   ├── init-db.sql                  # Script de inicialización BD
│   │   └── books.json                   # Datos consolidados para seeding
│   └── design_docs/
│       ├── 01-project-overview.md
│       ├── 02-project-structure.md
│       ├── 03-hu-001-create-book.md
│       └── 04-hu-002-initial-data-load.md
│
├── apps/
│   ├── api-cli/                             # 🖥️ Backend: API REST
│   │   ├── src/
│   │   │   ├── domain/                      # 💎 NÚCLEO - Lógica de negocio pura
│   │   │   │   ├── entities/
│   │   │   │   │   ├── Book.ts
│   │   │   │   │   ├── Author.ts            # Entidad Author (N:M con Book)
│   │   │   │   │   ├── BookType.ts          # Entidad BookType (N:1 con Book)
│   │   │   │   │   └── Category.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── BookFormat.ts
│   │   │   │   │   └── ISBN.ts
│   │   │   │   └── errors/
│   │   │   │       └── DomainErrors.ts
│   │   │   │
│   │   │   ├── application/                 # 🔄 CASOS DE USO
│   │   │   │   ├── use-cases/
│   │   │   │   │   └── CreateBookUseCase.ts
│   │   │   │   ├── ports/
│   │   │   │   │   ├── BookRepository.ts
│   │   │   │   │   ├── AuthorRepository.ts
│   │   │   │   │   ├── TypeRepository.ts
│   │   │   │   │   ├── CategoryRepository.ts
│   │   │   │   │   ├── EmbeddingService.ts
│   │   │   │   │   └── Logger.ts
│   │   │   │   └── errors/
│   │   │   │       └── ApplicationErrors.ts
│   │   │   │
│   │   │   ├── infrastructure/              # 🔌 ADAPTADORES
│   │   │   │   ├── driven/
│   │   │   │   │   ├── persistence/
│   │   │   │   │   │   ├── PostgresBookRepository.ts
│   │   │   │   │   │   ├── PostgresAuthorRepository.ts
│   │   │   │   │   │   ├── PostgresTypeRepository.ts
│   │   │   │   │   │   ├── PostgresCategoryRepository.ts
│   │   │   │   │   │   ├── drizzle/
│   │   │   │   │   │   │   └── schema.ts
│   │   │   │   │   │   └── mappers/
│   │   │   │   │   │       ├── BookMapper.ts
│   │   │   │   │   │       ├── AuthorMapper.ts
│   │   │   │   │   │       └── TypeMapper.ts
│   │   │   │   │   ├── embedding/
│   │   │   │   │   │   └── OllamaEmbeddingService.ts
│   │   │   │   │   └── logging/
│   │   │   │   │       └── PinoLogger.ts
│   │   │   │   │
│   │   │   │   ├── driver/
│   │   │   │   │   └── http/
│   │   │   │   │       ├── server.ts
│   │   │   │   │       ├── routes/
│   │   │   │   │       │   └── books.routes.ts
│   │   │   │   │       ├── controllers/
│   │   │   │   │       │   └── BooksController.ts
│   │   │   │   │       └── schemas/
│   │   │   │   │           └── book.schemas.ts
│   │   │   │   │
│   │   │   │   └── config/
│   │   │   │       └── env.ts
│   │   │   │
│   │   │   ├── shared/                      # 🛠️ UTILIDADES COMPARTIDAS
│   │   │   │   └── utils/
│   │   │   │       └── uuid.ts
│   │   │   │
│   │   │   └── server.ts                    # Entry point HTTP server
│   │   │
│   │   ├── scripts/                         # 📜 Scripts de utilidad
│   │   │   ├── consolidate-books.ts         # Consolida JSONs de origen
│   │   │   └── seed-database.ts             # Carga datos en BD
│   │   │
│   │   ├── data/
│   │   │   └── source/                      # Ficheros JSON de origen
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   └── scripts/
│   │   │   ├── integration/
│   │   │   │   └── infrastructure/
│   │   │   └── e2e/
│   │   │       └── http/
│   │   │
│   │   ├── docker/
│   │   │   ├── Dockerfile
│   │   │   ├── Dockerfile.dev
│   │   │   └── entrypoint.dev.sh
│   │   │
│   │   ├── drizzle/                         # Migraciones Drizzle
│   │   ├── .env.example
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── web-client/                          # 🌐 Frontend: Cliente Web (futuro)
│       └── .gitkeep
│
├── docker-compose.yml                       # 🐳 Orquestación desarrollo
├── docker-compose.prod.yml                  # 🐳 Orquestación producción
├── AGENTS.md                                # 📋 Guías para agentes IA
├── .gitignore
└── README.md
```

---

## 4. Estructura Monorepo

### 4.1 ¿Por qué Monorepo?

El proyecto se organiza como un **monorepo** con múltiples aplicaciones:

| Directorio | Propósito |
|------------|-----------|
| `apps/api-cli/` | Backend con API REST - Contiene toda la lógica de negocio |
| `apps/web-client/` | Cliente web futuro - Consumirá la API REST |

**Beneficios:**
- **Código compartido**: El cliente web puede reutilizar tipos y contratos de la API
- **Despliegue independiente**: Cada app tiene su propio Dockerfile y ciclo de vida
- **Desarrollo coordinado**: Cambios en la API se pueden validar contra el cliente en el mismo commit

### 4.2 Docker por Aplicación

Cada aplicación dentro de `apps/` tiene su propia configuración Docker:

```
apps/api-cli/docker/
├── Dockerfile          # Imagen de producción (código copiado)
└── Dockerfile.dev      # Imagen de desarrollo (código montado por volumen)
```

Los archivos `docker-compose.yml` en la raíz orquestan todos los servicios.

---

## 5. Explicación Detallada por Capa

### 5.1 Domain (`src/domain/`)

> **Regla de oro**: Esta capa NO importa NADA de las otras capas. Es TypeScript puro, sin dependencias externas.

#### `entities/`

Contiene las entidades del dominio con su lógica de negocio encapsulada.

```typescript
// Book.ts - La entidad conoce sus propias reglas
export class Book {
  private constructor(
    public readonly id: string,
    public readonly isbn: string | null,
    public readonly title: string,
    // ...
  ) {}

  static create(props: CreateBookProps): Book {
    // Validaciones de dominio aquí
  }

  updateDescription(description: string): Book {
    // Retorna nueva instancia (inmutabilidad)
  }
}
```

#### `value-objects/`

Objetos inmutables que representan conceptos del dominio sin identidad propia.

```typescript
// BookType.ts
export class BookType {
  private static readonly VALID_TYPES = ['technical', 'novel', 'essay', ...];
  
  private constructor(public readonly value: string) {}
  
  static create(value: string): BookType {
    if (!this.VALID_TYPES.includes(value)) {
      throw new InvalidBookTypeError(value);
    }
    return new BookType(value);
  }
}
```

#### `ports/`

Interfaces que definen los contratos de comunicación.

**`driven/` (Secondary Ports - Output)**

Son las interfaces que el dominio NECESITA para funcionar. El dominio las define, otros las implementan.

```typescript
// BookRepository.ts
export interface BookRepository {
  save(book: Book): Promise<void>;
  findById(id: string): Promise<Book | null>;
  findByIsbn(isbn: string): Promise<Book | null>;
  search(query: string, limit: number): Promise<Book[]>;
  delete(id: string): Promise<void>;
}

// EmbeddingService.ts
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
}
```

**`driver/` (Primary Ports - Input)**

Son las interfaces que exponen las capacidades del dominio al mundo exterior.

```typescript
// BookService.ts
export interface BookService {
  createBook(data: CreateBookDTO): Promise<Book>;
  getBook(id: string): Promise<Book>;
  searchBooks(query: string): Promise<Book[]>;
  updateBook(id: string, data: UpdateBookDTO): Promise<Book>;
  deleteBook(id: string): Promise<void>;
}
```

#### `errors/`

Errores específicos del dominio.

```typescript
// DomainErrors.ts
export class BookNotFoundError extends Error {
  constructor(id: string) {
    super(`Book with id ${id} not found`);
  }
}

export class InvalidISBNError extends Error {
  constructor(isbn: string) {
    super(`Invalid ISBN format: ${isbn}`);
  }
}
```

---

### 5.2 Application (`src/application/`)

> Orquesta los casos de uso. Coordina entidades del dominio y llama a los puertos necesarios.

#### `commands/`

Operaciones que modifican el estado del sistema (escritura).

```typescript
// CreateBook.ts
export class CreateBookCommand {
  constructor(
    private readonly bookRepository: BookRepository,
    private readonly embeddingService: EmbeddingService
  ) {}

  async execute(data: CreateBookDTO): Promise<Book> {
    const embedding = await this.embeddingService.generateEmbedding(
      `${data.title} ${data.description}`
    );
    
    const book = Book.create({ ...data, embedding });
    await this.bookRepository.save(book);
    
    return book;
  }
}
```

#### `queries/`

Operaciones de solo lectura.

```typescript
// SearchBooks.ts
export class SearchBooksQuery {
  constructor(
    private readonly bookRepository: BookRepository,
    private readonly embeddingService: EmbeddingService
  ) {}

  async execute(searchText: string, limit = 10): Promise<Book[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(searchText);
    return this.bookRepository.searchByEmbedding(queryEmbedding, limit);
  }
}
```

#### `services/`

Facade que agrupa comandos y queries relacionados.

```typescript
// BookApplicationService.ts
export class BookApplicationService implements BookService {
  constructor(
    private readonly createBookCommand: CreateBookCommand,
    private readonly searchBooksQuery: SearchBooksQuery,
    // ...
  ) {}

  async createBook(data: CreateBookDTO): Promise<Book> {
    return this.createBookCommand.execute(data);
  }

  async searchBooks(query: string): Promise<Book[]> {
    return this.searchBooksQuery.execute(query);
  }
}
```

---

### 5.3 Infrastructure (`src/infrastructure/`)

> Implementaciones concretas de los puertos. Aquí vive todo el código que depende de tecnologías específicas.

#### `driven/` (Secondary Adapters)

Implementan los puertos de salida definidos por el dominio.

**`persistence/`**

```typescript
// PostgresBookRepository.ts
export class PostgresBookRepository implements BookRepository {
  constructor(private readonly db: DrizzleClient) {}

  async save(book: Book): Promise<void> {
    const record = BookMapper.toPersistence(book);
    await this.db.insert(books).values(record);
  }

  async searchByEmbedding(embedding: number[], limit: number): Promise<Book[]> {
    // Usa pgvector para búsqueda por similitud coseno
    const results = await this.db
      .select()
      .from(books)
      .orderBy(cosineDistance(books.embedding, embedding))
      .limit(limit);
    
    return results.map(BookMapper.toDomain);
  }
}
```

**`embedding/`**

```typescript
// OllamaEmbeddingService.ts
export class OllamaEmbeddingService implements EmbeddingService {
  constructor(private readonly baseUrl: string) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });
    
    const data = await response.json();
    return data.embedding;
  }
}
```

#### `driver/` (Primary Adapters)

Consumen los puertos de entrada y exponen el sistema al mundo exterior.

**`http/`**

```typescript
// routes/books.routes.ts
export async function booksRoutes(
  fastify: FastifyInstance,
  bookService: BookService
) {
  fastify.post('/books', {
    schema: createBookSchema,
    handler: async (request, reply) => {
      const book = await bookService.createBook(request.body);
      return reply.status(201).send(book);
    }
  });

  fastify.get('/books/search', {
    schema: searchBooksSchema,
    handler: async (request, reply) => {
      const { q, limit } = request.query;
      const books = await bookService.searchBooks(q);
      return reply.send(books);
    }
  });
}
```

#### `config/`

Configuración y composición de dependencias.

```typescript
// container.ts - Dependency Injection manual
export function createContainer(config: Config) {
  // Driven adapters
  const db = createDrizzleClient(config.database);
  const bookRepository = new PostgresBookRepository(db);
  const embeddingService = new OllamaEmbeddingService(config.ollama.baseUrl);

  // Application services
  const createBookCommand = new CreateBookCommand(bookRepository, embeddingService);
  const searchBooksQuery = new SearchBooksQuery(bookRepository, embeddingService);
  const bookService = new BookApplicationService(createBookCommand, searchBooksQuery);

  return { bookService, db };
}
```

---

### 5.4 Shared (`src/shared/`)

Utilidades que no pertenecen a ninguna capa específica pero son usadas por varias.

```typescript
// utils/uuid.ts
export function generateUUID(): string {
  return crypto.randomUUID();
}
```

---

### 5.5 Tests (`tests/`)

Estructura espejo del código fuente, separada por tipo de test.

| Carpeta | Propósito | Dependencias |
|---------|-----------|--------------|
| `unit/` | Testear dominio y application en aislamiento | Mocks de puertos |
| `integration/` | Testear adapters con sus dependencias reales | Testcontainers |
| `e2e/` | Testear el sistema completo via HTTP | Docker compose |

---

## 6. Configuración Docker

### 6.1 Arquitectura de Contenedores

```
┌─────────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    api-cli      │  │    postgres     │  │     ollama      │ │
│  │   (Node.js)     │  │   + pgvector    │  │  (embeddings)   │ │
│  │                 │  │                 │  │                 │ │
│  │  - API: 3000    │  │  - Port: 5432   │  │  - Port: 11434  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│          │                    │                    │           │
│          └────────────────────┴────────────────────┘           │
│                         network: library                        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Entornos

| Archivo | Propósito |
|---------|-----------|
| `docker-compose.yml` | Desarrollo - Monta código por volumen, hot reload |
| `docker-compose.prod.yml` | Producción - Código copiado en imagen, optimizado |

### 6.3 Desarrollo vs Producción

| Aspecto | Desarrollo | Producción |
|---------|------------|------------|
| **Código** | Montado por volumen | Copiado en imagen |
| **Hot Reload** | ✅ Sí | ❌ No |
| **node_modules** | En contenedor | En imagen |
| **Optimización** | No | Sí (multi-stage build) |
| **Logs** | Verbose | Estructurados |

---

## 7. Flujo de una Request

### Ejemplo: Búsqueda semántica de libros

```
┌─────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  User   │────▶│  HTTP Adapter   │────▶│  BookApplication    │
│         │     │  (Fastify)      │     │  Service            │
└─────────┘     └─────────────────┘     └──────────┬──────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │  SearchBooksQuery   │
                                        └──────────┬──────────┘
                                                   │
                        ┌──────────────────────────┴───────────────────────┐
                        │                                                  │
                        ▼                                                  ▼
             ┌─────────────────────┐                          ┌─────────────────────┐
             │  EmbeddingService   │                          │   BookRepository    │
             │  (Port)             │                          │   (Port)            │
             └──────────┬──────────┘                          └──────────┬──────────┘
                        │                                                │
                        ▼                                                ▼
             ┌─────────────────────┐                          ┌─────────────────────┐
             │  OllamaEmbedding    │                          │  PostgresBook       │
             │  Service (Adapter)  │                          │  Repository         │
             └──────────┬──────────┘                          └──────────┬──────────┘
                        │                                                │
                        ▼                                                ▼
                ┌──────────────┐                                ┌──────────────┐
                │   Ollama     │                                │  PostgreSQL  │
                │   Container  │                                │  + pgvector  │
                └──────────────┘                                └──────────────┘
```

---

## 8. Reglas de Dependencia

```
                    ┌─────────────────┐
                    │     Domain      │  ← No depende de nada
                    └────────▲────────┘
                             │
                    ┌────────┴────────┐
                    │   Application   │  ← Solo depende de Domain
                    └────────▲────────┘
                             │
                    ┌────────┴────────┐
                    │ Infrastructure  │  ← Depende de Domain y Application
                    └─────────────────┘
```

**Regla fundamental**: Las dependencias SIEMPRE apuntan hacia adentro (hacia el dominio). Nunca al revés.

---

## 9. Referencias

- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports & Adapters Pattern](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
