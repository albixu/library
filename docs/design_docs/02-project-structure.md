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
│       ├── 04-hu-002-initial-data-load.md
│       ├── 05-hu-003-book-level.md          # Superseded by HU-008
│       ├── 06-hu-004-standardize-api-responses.md
│       ├── 07-hu-005-list-book-types.md
│       └── 08-hu-008-type-category-level-relationships.md
│
├── apps/
│   ├── api-cli/                             # 🖥️ Backend: API REST
│   │   ├── src/
│   │   │   ├── domain/                      # 💎 NÚCLEO - Lógica de negocio pura
│   │   │   │   ├── entities/
│   │   │   │   │   ├── Book.ts
│   │   │   │   │   ├── Author.ts            # Entidad Author (N:M con Book)
│   │   │   │   │   ├── BookType.ts          # Entidad BookType (N:1 con Book)
│   │   │   │   │   ├── Category.ts          # Entidad Category (pertenece a Type)
│   │   │   │   │   ├── Level.ts             # Entidad Level (N:M con Type)
│   │   │   │   │   └── index.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── BookFormat.ts
│   │   │   │   │   ├── ISBN.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── validators/
│   │   │   │   │   ├── uuid.ts              # Validación UUID compartida
│   │   │   │   │   └── index.ts
│   │   │   │   ├── errors/
│   │   │   │   │   ├── DomainErrors.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── application/                 # 🔄 CASOS DE USO
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── CreateBookUseCase.ts
│   │   │   │   │   ├── ListBookTypesUseCase.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ports/
│   │   │   │   │   ├── BookRepository.ts
│   │   │   │   │   ├── AuthorRepository.ts
│   │   │   │   │   ├── TypeRepository.ts
│   │   │   │   │   ├── CategoryRepository.ts
│   │   │   │   │   ├── LevelRepository.ts   # Puerto Level (N:M con Type)
│   │   │   │   │   ├── EmbeddingService.ts
│   │   │   │   │   ├── TranslationService.ts # Puerto para traducciones (HU-013)
│   │   │   │   │   ├── Logger.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── errors/
│   │   │   │   │   ├── ApplicationErrors.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── infrastructure/              # 🔌 ADAPTADORES
│   │   │   │   ├── driven/
│   │   │   │   │   ├── persistence/
│   │   │   │   │   │   ├── PostgresBookRepository.ts
│   │   │   │   │   │   ├── PostgresAuthorRepository.ts
│   │   │   │   │   │   ├── PostgresTypeRepository.ts
│   │   │   │   │   │   ├── PostgresCategoryRepository.ts
│   │   │   │   │   │   ├── PostgresLevelRepository.ts  # Implementa LevelRepository
│   │   │   │   │   │   ├── types.ts              # DatabaseClient type
│   │   │   │   │   │   ├── utils.ts              # Utilidades (isDuplicateKeyError)
│   │   │   │   │   │   ├── drizzle/
│   │   │   │   │   │   │   └── schema.ts
│   │   │   │   │   │   ├── mappers/
│   │   │   │   │   │   │   ├── BookMapper.ts
│   │   │   │   │   │   │   ├── AuthorMapper.ts
│   │   │   │   │   │   │   ├── CategoryMapper.ts
│   │   │   │   │   │   │   ├── TypeMapper.ts
│   │   │   │   │   │   │   ├── LevelMapper.ts    # Mapper Level <-> DB
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── embedding/
│   │   │   │   │   │   ├── OllamaEmbeddingService.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── translation/          # HU-013: Servicio de traducción
│   │   │   │   │   │   ├── OllamaTranslationService.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── logging/
│   │   │   │   │       ├── PinoLogger.ts
│   │   │   │   │       └── index.ts
│   │   │   │   │
│   │   │   │   ├── driver/
│   │   │   │   │   └── http/
│   │   │   │   │       ├── server.ts
│   │   │   │   │       ├── routes/
│   │   │   │   │       │   ├── books.routes.ts
│   │   │   │   │       │   └── book-types.routes.ts
│   │   │   │   │       ├── controllers/
│   │   │   │   │       │   ├── BooksController.ts
│   │   │   │   │       │   └── BookTypesController.ts
│   │   │   │   │       ├── errors/
│   │   │   │   │       │   └── HttpErrorMapper.ts
│   │   │   │   │       ├── schemas/
│   │   │   │   │       │   ├── book.schemas.ts
│   │   │   │   │       │   └── common.schemas.ts
│   │   │   │   │       └── index.ts
│   │   │   │   │
│   │   │   │   ├── config/
│   │   │   │   │   ├── env.ts
│   │   │   │   │   └── index.ts
│   │   │   │   │
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── shared/                      # 🛠️ UTILIDADES COMPARTIDAS
│   │   │   │   ├── utils/
│   │   │   │   │   ├── uuid.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
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
│   │   │   │   ├── infrastructure/
│   │   │   │   └── scripts/
│   │   │   ├── integration/
│   │   │   │   ├── application/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── setup.ts
│   │   │   └── e2e/
│   │   │       ├── http/
│   │   │       └── setup.ts
│   │   │
│   │   ├── docker/
│   │   │   ├── Dockerfile
│   │   │   ├── Dockerfile.dev
│   │   │   └── entrypoint.dev.sh
│   │   │
│   │   ├── drizzle/                         # Migraciones Drizzle
│   │   ├── .env.example
│   │   ├── drizzle.config.ts
│   │   ├── eslint.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── vitest.integration.config.ts
│   │   └── vitest.e2e.config.ts
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
// BookFormat.ts
export class BookFormat {
  private static readonly VALID_FORMATS = ['epub', 'pdf', 'mobi', ...];
  
  private constructor(public readonly value: string) {}
  
  static create(value: string): BookFormat {
    if (!this.VALID_FORMATS.includes(value)) {
      throw new InvalidBookFormatError(value);
    }
    return new BookFormat(value);
  }
}
```

### 5.2 Application (`src/application/`)

> Orquesta los casos de uso. Coordina entidades del dominio y llama a los puertos necesarios.

#### `ports/`

Interfaces que definen los contratos de comunicación con adaptadores externos (driven/secondary ports).

```typescript
// BookRepository.ts
export interface BookRepository {
  save(params: SaveBookParams): Promise<Book>;
  findById(id: string): Promise<Book | null>;
  findByIsbn(isbn: string): Promise<Book | null>;
  findAll(): Promise<Book[]>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

// EmbeddingService.ts
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
}

// Logger.ts
export interface Logger {
  info(message: string, context?: object): void;
  error(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  debug(message: string, context?: object): void;
}
```

#### `use-cases/`

Casos de uso que orquestan la lógica de negocio.

```typescript
// CreateBookUseCase.ts
export class CreateBookUseCase {
  constructor(
    private readonly bookRepository: BookRepository,
    private readonly embeddingService: EmbeddingService,
    // ...
  ) {}

  async execute(input: CreateBookInput): Promise<Book> {
    // Orquesta la creación del libro
  }
}
```

#### `errors/`

Errores específicos de la capa de aplicación.

```typescript
// ApplicationErrors.ts
export class EmbeddingTextTooLongError extends Error {
  constructor(length: number, maxLength: number) {
    super(`Embedding text too long (${length} characters). Maximum: ${maxLength}`);
  }
}
```

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

Exponen el sistema al mundo exterior a través de HTTP.

**`http/`**

```typescript
// controllers/BooksController.ts
export class BooksController {
  constructor(private readonly createBookUseCase: CreateBookUseCase) {}

  async createBook(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.createBookUseCase.execute(request.body);
    return reply.status(201).send({
      success: true,
      data: BookResponseMapper.toResponse(result),
      error: null,
    });
  }
}

// routes/books.routes.ts
export function registerBooksRoutes(
  fastify: FastifyInstance,
  controller: BooksController
) {
  fastify.post('/books', {
    schema: createBookSchema,
    handler: controller.createBook.bind(controller),
  });
}
```

**`errors/`**

```typescript
// HttpErrorMapper.ts - Mapea errores de dominio a respuestas HTTP
export class HttpErrorMapper {
  static toHttpError(error: Error): { statusCode: number; message: string } {
    if (error instanceof DuplicateISBNError) {
      return { statusCode: 409, message: error.message };
    }
    // ...
  }
}
```

#### `config/`

Configuración de variables de entorno con Zod.

```typescript
// env.ts
export function loadEnvConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error('Invalid environment configuration');
  }
  return result.data;
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
