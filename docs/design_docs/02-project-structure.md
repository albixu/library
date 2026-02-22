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
                    │  (HTTP API, PostgreSQL, Ollama)     │
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
│   ├── design_docs/
│   │   ├── 01-project-overview.md
│   │   ├── 02-project-structure.md
│   │   └── 03-web-client-design.md
│   └── user_stories/
│       ├── 00-hu-001-create-book.md
│       ├── 01-hu-002-initial-data-load.md
│       ├── 02-hu-003-book-level.md          # Superseded by HU-008
│       ├── 03-hu-004-standardize-api-responses.md
│       ├── 04-hu-005-list-book-types.md
│       ├── 05-hu-008-type-category-level-relationships.md
│       ├── 06-hu-009-list-categories.md
│       ├── 07-hu-010-list-book-levels.md
│       ├── 08-hu-011-consolidate-books.md
│       ├── 09-hu-012-search-books.md
│       └── 10-hu-013-book-description-translation.md
│
├── apps/
│   ├── api/                                  # 🖥️ Backend: API REST
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
│   │   │   │   ├── criteria/                # HU-012: Patrón Criteria para consultas
│   │   │   │   │   ├── Criteria.ts          # Clase principal de criterio
│   │   │   │   │   ├── Filter.ts            # Filtro individual
│   │   │   │   │   ├── Filters.ts           # Colección de filtros
│   │   │   │   │   ├── FilterField.ts       # Campo del filtro
│   │   │   │   │   ├── FilterOperator.ts    # Operadores (EQUALS, CONTAINS, etc.)
│   │   │   │   │   ├── FilterValue.ts       # Valor del filtro
│   │   │   │   │   ├── Order.ts             # Ordenamiento
│   │   │   │   │   ├── OrderBy.ts           # Campo de ordenamiento
│   │   │   │   │   ├── OrderType.ts         # Dirección (ASC/DESC)
│   │   │   │   │   ├── constants.ts         # Constantes del dominio
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
│   │   │   │   │   ├── SearchBooksUseCase.ts    # HU-012: Búsqueda con criterios
│   │   │   │   │   ├── ListBookTypesUseCase.ts
│   │   │   │   │   ├── ListCategoriesUseCase.ts # HU-009: Listar categorías
│   │   │   │   │   ├── ListBookLevelsUseCase.ts # HU-010: Listar niveles
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
│   │   │   │   │       │   ├── books.routes.ts       # POST /books, GET /books
│   │   │   │   │       │   ├── book-types.routes.ts  # GET /book-types
│   │   │   │   │       │   ├── categories.routes.ts  # GET /book-categories
│   │   │   │   │       │   └── book-levels.routes.ts # GET /book-levels
│   │   │   │   │       ├── controllers/
│   │   │   │   │       │   ├── BooksController.ts         # Crear libro
│   │   │   │   │       │   ├── SearchBooksController.ts   # Buscar libros
│   │   │   │   │       │   ├── BookTypesController.ts     # Listar tipos
│   │   │   │   │       │   ├── CategoriesController.ts    # Listar categorías
│   │   │   │   │       │   └── BookLevelsController.ts    # Listar niveles
│   │   │   │   │       ├── errors/
│   │   │   │   │       │   └── HttpErrorMapper.ts
│   │   │   │   │       ├── schemas/
│   │   │   │   │       │   ├── book.schemas.ts
│   │   │   │   │       │   ├── search-books.schemas.ts    # HU-012: Schemas de búsqueda
│   │   │   │   │       │   ├── category.schemas.ts
│   │   │   │   │       │   ├── book-level.schemas.ts
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
│   └── web-client/                          # 🌐 Frontend: Cliente Web (Angular)
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/                    # Singleton services, guards, interceptors
│       │   │   │   ├── services/            # API services, theme service
│       │   │   │   ├── interceptors/        # HTTP interceptors
│       │   │   │   └── models/              # Domain models/interfaces
│       │   │   │
│       │   │   ├── features/                # Feature modules (lazy loaded)
│       │   │   │   ├── book-search/         # Búsqueda de libros
│       │   │   │   │   ├── components/
│       │   │   │   │   ├── pages/
│       │   │   │   │   ├── services/
│       │   │   │   │   └── book-search.routes.ts
│       │   │   │   │
│       │   │   │   └── book-detail/         # Detalle de libro + envío Kindle
│       │   │   │       ├── components/
│       │   │   │       ├── pages/
│       │   │   │       └── book-detail.routes.ts
│       │   │   │
│       │   │   ├── shared/                  # Componentes y utilidades compartidas
│       │   │   │   ├── ui/                  # Design System Components
│       │   │   │   │   ├── atoms/           # Button, Input, Badge, Icon, Spinner
│       │   │   │   │   ├── molecules/       # SearchInput, Select, Pagination
│       │   │   │   │   ├── organisms/       # DataTable, FilterPanel, Header
│       │   │   │   │   └── index.ts
│       │   │   │   ├── directives/
│       │   │   │   ├── pipes/
│       │   │   │   └── utils/
│       │   │   │
│       │   │   ├── layouts/                 # Layout components
│       │   │   │   └── main-layout/
│       │   │   │
│       │   │   └── app.routes.ts
│       │   │
│       │   ├── assets/                      # Recursos estáticos
│       │   ├── styles/                      # Estilos globales
│       │   │   ├── tokens/                  # Design tokens (colors, typography, spacing)
│       │   │   ├── themes/                  # Temas light/dark
│       │   │   ├── base/                    # Reset, typography base
│       │   │   └── styles.scss
│       │   │
│       │   └── environments/                # Configuración por entorno
│       │
│       ├── .storybook/                      # Configuración Storybook
│       │   ├── main.ts
│       │   ├── preview.ts
│       │   └── manager.ts
│       │
│       ├── tests/                           # Tests separados del código fuente
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       │
│       ├── docker/
│       │   └── Dockerfile
│       ├── nginx.conf
│       ├── angular.json
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
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
| `apps/api/` | Backend con API REST - Contiene toda la lógica de negocio |
| `apps/web-client/` | Cliente web Angular - Interfaz de usuario para búsqueda y gestión |

**Beneficios:**
- **Código compartido**: El cliente web puede reutilizar tipos y contratos de la API
- **Despliegue independiente**: Cada app tiene su propio Dockerfile y ciclo de vida
- **Desarrollo coordinado**: Cambios en la API se pueden validar contra el cliente en el mismo commit

### 4.2 Docker por Aplicación

Cada aplicación dentro de `apps/` tiene su propia configuración Docker:

```
apps/api/docker/
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

## 6. Estructura del Web Client (Angular)

El Web Client sigue una arquitectura de capas similar a la API, aplicando principios de Clean Architecture y DDD adaptados al frontend.

### 6.1 Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Angular | 19.x |
| Lenguaje | TypeScript | 5.x |
| State Management | Angular Signals | Built-in |
| Estilos | SCSS + CSS Variables | - |
| UI Components | Design System propio (Atomic Design) | - |
| Component Docs | Storybook | 8.x |
| Testing Unit | Vitest + Angular Testing Library | Latest |
| Testing E2E | Playwright | Latest |

### 6.2 Arquitectura de Capas

```
src/app/
├── core/                    # 🔧 SERVICIOS SINGLETON
│   ├── services/            # API services, theme service
│   ├── interceptors/        # HTTP interceptors (error handling, loading)
│   └── models/              # Domain models/interfaces
│
├── features/                # 📦 MÓDULOS DE FEATURE (lazy loaded)
│   ├── book-search/         # Feature: Búsqueda de libros
│   └── book-detail/         # Feature: Detalle + envío Kindle
│
├── shared/                  # 🎨 DESIGN SYSTEM
│   └── ui/                  # Componentes UI reutilizables
│       ├── atoms/           # Elementos básicos (Button, Input, Badge)
│       ├── molecules/       # Grupos de átomos (SearchInput, Select)
│       └── organisms/       # Componentes complejos (DataTable, Header)
│
└── layouts/                 # 📐 LAYOUTS
    └── main-layout/         # Header, footer, contenedor principal
```

### 6.3 Core (`src/app/core/`)

> Servicios singleton que se instancian una vez y están disponibles en toda la aplicación.

#### `services/`

```typescript
// api.service.ts - Servicio base para llamadas HTTP
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = inject(ENVIRONMENT).apiUrl;
  private readonly http = inject(HttpClient);
  
  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params });
  }
  
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }
}

// theme.service.ts - Gestión de tema dark/light
@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'light' | 'dark'>(this.getInitialTheme());
  
  toggleTheme(): void {
    const newTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('library-theme', newTheme);
  }
}
```

#### `interceptors/`

```typescript
// error.interceptor.ts - Manejo centralizado de errores HTTP
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Ha ocurrido un error inesperado';
      
      if (error.status === 0) {
        message = 'No se puede conectar con el servidor';
      } else if (error.status >= 500) {
        message = 'Error del servidor. Intente más tarde';
      }
      
      inject(NotificationService).error(message);
      return throwError(() => ({ status: error.status, message }));
    })
  );
};
```

### 6.4 Features (`src/app/features/`)

> Módulos de funcionalidad independientes, cargados mediante lazy loading.

Cada feature sigue la misma estructura:

```
book-search/
├── components/              # Componentes específicos de la feature
│   ├── search-filters/
│   └── book-table/
├── pages/                   # Páginas/routes de la feature
│   └── book-search-page/
├── services/                # Servicios específicos (stores, etc.)
│   └── book-search.store.ts
└── book-search.routes.ts    # Rutas de la feature
```

#### State Management con Signals

```typescript
// book-search.store.ts - Store de la feature con Signals
@Injectable()
export class BookSearchStore {
  // State (privado)
  private readonly _books = signal<Book[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // Public readonly signals
  readonly books = this._books.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed
  readonly isEmpty = computed(() => 
    this._books().length === 0 && !this._loading()
  );
  
  // Actions
  async search(filters: SearchFilters): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    
    try {
      const response = await this.bookService.search(filters);
      this._books.set(response.data);
    } catch (error) {
      this._error.set(this.handleError(error));
    } finally {
      this._loading.set(false);
    }
  }
}
```

### 6.5 Shared UI - Design System (`src/app/shared/ui/`)

> Sistema de componentes basado en **Atomic Design** con documentación en Storybook.

#### Metodología Atomic Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         PAGES                                    │
│   Páginas completas con datos reales                            │
│   Ejemplo: BookSearchPage, BookDetailPage                        │
├─────────────────────────────────────────────────────────────────┤
│                       ORGANISMS                                  │
│   Componentes complejos formados por moléculas y átomos         │
│   Ejemplo: BookTable, SearchFilters, BookInfoCard               │
├─────────────────────────────────────────────────────────────────┤
│                       MOLECULES                                  │
│   Grupos de átomos que funcionan juntos como unidad             │
│   Ejemplo: SearchInput, FilterDropdown, Pagination              │
├─────────────────────────────────────────────────────────────────┤
│                         ATOMS                                    │
│   Elementos UI básicos e indivisibles                           │
│   Ejemplo: Button, Input, Badge, Icon, Spinner                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Convenciones de Componentes

| Tipo | Prefijo | Ejemplo |
|------|---------|---------|
| Átomo | `Ui` | `UiButtonComponent`, `UiInputComponent` |
| Molécula | `Ui` | `UiSearchInputComponent`, `UiSelectComponent` |
| Organismo | `Ui` | `UiDataTableComponent`, `UiFilterPanelComponent` |
| Feature | - | `BookTableComponent`, `SearchFiltersComponent` |

#### Ejemplo de Componente Átomo

```typescript
// shared/ui/atoms/button/button.component.ts
@Component({
  selector: 'ui-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class UiButtonComponent {
  // Inputs con Signals
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  
  // Outputs
  readonly clicked = output<MouseEvent>();
  
  // Computed classes
  protected readonly hostClasses = computed(() => {
    return [
      'ui-button',
      `ui-button--${this.variant()}`,
      `ui-button--${this.size()}`,
      this.loading() ? 'ui-button--loading' : '',
    ].filter(Boolean).join(' ');
  });
}
```

### 6.6 Design Tokens (`src/styles/tokens/`)

> Variables fundamentales que definen el sistema visual.

#### Estructura

```
src/styles/
├── tokens/
│   ├── _colors.scss           # Paleta de colores
│   ├── _typography.scss       # Fuentes, tamaños, line-heights
│   ├── _spacing.scss          # Espaciados (escala 4px)
│   ├── _borders.scss          # Bordes y radios
│   ├── _shadows.scss          # Sombras
│   └── _animations.scss       # Duraciones y easings
│
├── themes/
│   ├── _light.scss            # Tema claro
│   └── _dark.scss             # Tema oscuro
│
└── styles.scss                # Entry point
```

#### Tokens Semánticos (CSS Variables)

```scss
// Usar estos en componentes (no colores primitivos directamente)
:root {
  // Backgrounds
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  
  // Text
  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  
  // Interactive
  --color-interactive-primary: #2563eb;
  --color-interactive-primary-hover: #1d4ed8;
  
  // Feedback
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  
  // Spacing (escala 4px)
  --spacing-1: 0.25rem;  // 4px
  --spacing-2: 0.5rem;   // 8px
  --spacing-4: 1rem;     // 16px
  --spacing-6: 1.5rem;   // 24px
  
  // Border radius
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.375rem;
  --border-radius-lg: 0.5rem;
}

[data-theme="dark"] {
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #2d2d2d;
  --color-text-primary: #ffffff;
  // ... resto de overrides para tema oscuro
}
```

### 6.7 Storybook

> Documentación viva y desarrollo aislado de componentes.

```typescript
// shared/ui/atoms/button/button.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { UiButtonComponent } from './button.component';

const meta: Meta<UiButtonComponent> = {
  title: 'Atoms/Button',
  component: UiButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<UiButtonComponent>;

export const Primary: Story = {
  args: { variant: 'primary' },
  render: (args) => ({
    props: args,
    template: `<ui-button variant="primary">Primary Button</ui-button>`,
  }),
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem;">
        <ui-button variant="primary">Primary</ui-button>
        <ui-button variant="secondary">Secondary</ui-button>
        <ui-button variant="ghost">Ghost</ui-button>
        <ui-button variant="danger">Danger</ui-button>
      </div>
    `,
  }),
};
```

### 6.8 Tests del Web Client

| Carpeta | Propósito | Herramienta |
|---------|-----------|-------------|
| `tests/unit/` | Testear componentes, stores y services en aislamiento | Vitest + Angular Testing Library |
| `tests/integration/` | Testear interacción entre componentes | Vitest |
| `tests/e2e/` | Testear flujos completos del usuario | Playwright |

```typescript
// tests/unit/features/book-search/book-search.store.spec.ts
describe('BookSearchStore', () => {
  let store: BookSearchStore;
  let bookServiceMock: MockProxy<BookService>;
  
  beforeEach(() => {
    bookServiceMock = mock<BookService>();
    TestBed.configureTestingModule({
      providers: [
        BookSearchStore,
        { provide: BookService, useValue: bookServiceMock }
      ]
    });
    store = TestBed.inject(BookSearchStore);
  });
  
  it('should set loading to true while searching', async () => {
    bookServiceMock.search.mockReturnValue(of({ data: [], pagination: { hasMore: false } }));
    
    const searchPromise = store.search({});
    
    expect(store.loading()).toBe(true);
    await searchPromise;
    expect(store.loading()).toBe(false);
  });
});
```

### 6.9 Configuración Docker del Web Client

```dockerfile
# apps/web-client/docker/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/web-client/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# apps/web-client/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    # SPA routing - todas las rutas a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 7. Configuración Docker

### 7.1 Arquitectura de Contenedores

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         docker-compose.yml                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │  web-client   │  │     api       │  │   postgres    │  │    ollama     │ │
│  │   (Nginx)     │  │  (Node.js)    │  │  + pgvector   │  │  (embeddings) │ │
│  │               │  │               │  │               │  │               │ │
│  │ - Port: 4200  │  │ - Port: 3000  │  │ - Port: 5432  │  │ - Port: 11434 │ │
│  └───────┬───────┘  └───────┬───────┘  └───────────────┘  └───────────────┘ │
│          │                  │                  │                  │          │
│          │                  └──────────────────┴──────────────────┘          │
│          │                              │                                    │
│          └──────────────────────────────┘                                    │
│                              network: library                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Entornos

| Archivo | Propósito |
|---------|-----------|
| `docker-compose.yml` | Desarrollo - Monta código por volumen, hot reload |
| `docker-compose.prod.yml` | Producción - Código copiado en imagen, optimizado |

### 7.3 Desarrollo vs Producción

| Aspecto | Desarrollo | Producción |
|---------|------------|------------|
| **Código** | Montado por volumen | Copiado en imagen |
| **Hot Reload** | ✅ Sí | ❌ No |
| **node_modules** | En contenedor | En imagen |
| **Optimización** | No | Sí (multi-stage build) |
| **Logs** | Verbose | Estructurados |

---

## 8. Flujo de una Request

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

## 9. Reglas de Dependencia

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

## 10. Referencias

- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports & Adapters Pattern](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Angular 19 Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Storybook](https://storybook.js.org/)
- [Atomic Design - Brad Frost](https://bradfrost.com/blog/post/atomic-web-design/)
- [Playwright](https://playwright.dev)
- [Vitest](https://vitest.dev)
