# Diagrama de Flujo — Creación de un Libro (End-to-End)

Este diagrama de secuencia representa el flujo completo de creación de un libro en el sistema **Library**. Es el flujo más complejo del sistema, ya que involucra validaciones de dominio, traducción automática de descripciones a español, generación de embeddings vectoriales y persistencia atómica en PostgreSQL.

```mermaid
sequenceDiagram
    autonumber

    actor Client as 🌐 HTTP Client
    participant Controller as BooksController
    participant ZodSchema as Zod Schema\n(createBookSchema)
    participant UseCase as CreateBookUseCase
    participant TypeRepo as TypeRepository\n(Postgres)
    participant BookRepo as BookRepository\n(Postgres)
    participant CatRepo as CategoryRepository\n(Postgres)
    participant LevelRepo as LevelRepository\n(Postgres)
    participant AuthorRepo as AuthorRepository\n(Postgres)
    participant Domain as Book Entity\n(Domain)
    participant Translation as OllamaTranslationService\n(llama3.2:1b)
    participant Embedding as OllamaEmbeddingService\n(nomic-embed-text)
    participant DB as 🐘 PostgreSQL\n(pgvector)

    %% ─── ENTRADA HTTP ───────────────────────────────────────────────
    Client->>Controller: POST /api/books\n{ title, authors, description,\nlanguage, type, format,\ncategories, isbn?, level? }

    %% ─── VALIDACIÓN ZOD ─────────────────────────────────────────────
    Controller->>ZodSchema: safeParse(request.body)

    alt Validación fallida
        ZodSchema-->>Controller: { success: false, error }
        Controller-->>Client: 400 Bad Request\n{ success: false, error: { validation } }
    end

    ZodSchema-->>Controller: { success: true, data }

    %% ─── USE CASE ───────────────────────────────────────────────────
    Controller->>UseCase: execute(input)

    %% PASO 1-2: Validación early (format + ISBN) + Tipo
    Note over UseCase: 1. Validar BookFormat (value object)\ny crear ISBN value object si existe
    UseCase->>TypeRepo: findByName(input.type)
    TypeRepo->>DB: SELECT FROM types WHERE name = ?
    DB-->>TypeRepo: type | null

    alt Tipo no existe
        TypeRepo-->>UseCase: null
        UseCase-->>Controller: throws InvalidBookTypeError
        Controller-->>Client: 400 Bad Request\n{ error: "Invalid book type" }
    end

    TypeRepo-->>UseCase: BookType entity

    %% PASO 3: Duplicado ISBN
    UseCase->>BookRepo: checkDuplicate({ isbn })
    BookRepo->>DB: SELECT FROM books WHERE isbn = ?
    DB-->>BookRepo: { isDuplicate, duplicateType }

    alt ISBN duplicado
        BookRepo-->>UseCase: { isDuplicate: true, duplicateType: 'isbn' }
        UseCase-->>Controller: throws DuplicateISBNError
        Controller-->>Client: 409 Conflict\n{ error: "ISBN already exists" }
    end

    BookRepo-->>UseCase: { isDuplicate: false }

    %% PASO 4: Categorías
    UseCase->>CatRepo: findOrCreateMany(categoryNames, typeId)
    CatRepo->>DB: SELECT/INSERT categories (scoped to typeId)
    DB-->>CatRepo: Category[]
    CatRepo-->>UseCase: Category[]

    %% PASO 5: Level (opcional)
    opt input.level existe
        UseCase->>LevelRepo: findByName(levelName)
        LevelRepo->>DB: SELECT FROM levels WHERE name = ?
        DB-->>LevelRepo: Level | null

        alt Level existe → validar compatibilidad con tipo
            UseCase->>LevelRepo: existsForType(levelId, typeId)
            LevelRepo->>DB: SELECT FROM type_levels WHERE...
            DB-->>LevelRepo: boolean

            alt Level no válido para el tipo
                LevelRepo-->>UseCase: false
                UseCase-->>Controller: throws LevelTypeMismatchError
                Controller-->>Client: 400 Bad Request\n{ error: "Level not valid for type" }
            end

        else Level no existe → crear y asociar
            UseCase->>LevelRepo: save(newLevel)
            UseCase->>LevelRepo: addToType(levelId, typeId)
            LevelRepo->>DB: INSERT level + INSERT type_level
        end

        LevelRepo-->>UseCase: Level entity
    end

    %% PASO 6: Autores
    UseCase->>AuthorRepo: findOrCreateMany(authors)
    AuthorRepo->>DB: SELECT/INSERT authors
    DB-->>AuthorRepo: Author[]
    AuthorRepo-->>UseCase: Author[]

    %% PASO 7: Traducción
    Note over UseCase: 7. ¿Necesita traducción?
    alt language == 'es' O translatedDescription pre-proporcionada
        Note over UseCase: Sin llamada a Translation Service.\nUsa descripción original o pre-traducida.
    else language != 'es' Y sin pre-traducción
        loop Hasta 3 intentos (backoff: 1s, 2s, 4s)
            UseCase->>Translation: translate(description, 'es')
            Translation->>Translation: Validar longitud (max 25000 chars)
            Translation->>DB: POST /api/generate\n{ model: llama3.2:1b,\nprompt, stream: false,\ntemperature: 0.3 }
            Note right of Translation: Timeout: 60s por intento

            alt Respuesta OK
                DB-->>Translation: { response: "traducción..." }
                Translation-->>UseCase: { translatedText, model }
            else Error de red / timeout / HTTP error
                Translation-->>Translation: backoff exponencial\n(1s → 2s → 4s)
            end
        end

        alt Todos los intentos fallaron
            Translation-->>UseCase: throws TranslationServiceUnavailableError
            UseCase-->>Controller: throws TranslationServiceUnavailableError
            Controller-->>Client: 503 Service Unavailable\n{ error: "Translation service unavailable" }
        end
    end

    %% PASO 8: Crear entidad Book
    UseCase->>Domain: Book.create({ id, title, authors,\ndescription, translatedDescription,\nlanguage, type, categories,\nformat, isbn?, levelId? })
    Note over Domain: Valida todas las reglas de dominio:\n- Campos requeridos\n- Longitudes máximas\n- ISBN checksum\n- Código de idioma ISO 639-1\n- Formato de libro válido
    Domain-->>UseCase: Book entity

    %% PASO 9: Validar longitud embedding
    UseCase->>Domain: book.getTextForEmbedding()
    Domain-->>UseCase: embeddingText (title + authors +\ndescription(ES) + categories)

    alt embeddingText > 7000 chars (safety guard)
        UseCase-->>Controller: throws EmbeddingTextTooLongError
        Controller-->>Client: 400 Bad Request\n{ error: "Embedding text too long" }
    end

    %% PASO 10: Generar embedding
    UseCase->>Embedding: generateEmbedding(embeddingText)
    Embedding->>DB: POST /api/embeddings\n{ model: nomic-embed-text,\nprompt: embeddingText }
    Note right of Embedding: Timeout: 30s

    alt Embedding service caído
        DB-->>Embedding: Error / timeout
        Embedding-->>UseCase: throws EmbeddingServiceUnavailableError
        UseCase-->>Controller: throws EmbeddingServiceUnavailableError
        Controller-->>Client: 503 Service Unavailable\n{ error: "Embedding service unavailable" }
    end

    DB-->>Embedding: { embedding: number[768] }
    Embedding-->>UseCase: { embedding: number[768] }

    %% PASO 11: Persistir libro con embedding
    UseCase->>BookRepo: save({ book, embedding })
    BookRepo->>DB: INSERT books (con vector embedding)\n+ INSERT book_authors\n+ INSERT book_categories\n(transacción atómica)
    DB-->>BookRepo: Book (con id, timestamps)
    BookRepo-->>UseCase: savedBook

    %% RESPUESTA EXITOSA
    UseCase-->>Controller: CreateBookOutput DTO
    Controller-->>Client: 201 Created\n{ success: true, data: { id, title,\nauthors, originalDescription,\ndescription (ES), language, type,\nformat, categories, isbn?, level?,\navailable, path, createdAt, updatedAt } }
```

## Resumen del flujo

| Paso | Descripción | Error posible |
|---|---|---|
| 1 | Validación HTTP (Zod) | `400 Bad Request` |
| 2 | Validar tipo de libro existe en DB | `400 InvalidBookTypeError` |
| 3 | Detectar duplicado por ISBN | `409 DuplicateISBNError` |
| 4 | Resolver/crear categorías (scoped al tipo) | — |
| 5 | Resolver/crear nivel y validar compatibilidad con tipo | `400 LevelTypeMismatchError` |
| 6 | Resolver/crear autores | — |
| 7 | Traducir descripción a español (si language ≠ 'es') | `503 TranslationServiceUnavailableError` |
| 8 | Crear entidad `Book` (validaciones de dominio) | `400 DomainError` |
| 9 | Validar longitud del texto de embedding (max 7000) | `400 EmbeddingTextTooLongError` |
| 10 | Generar embedding vectorial (768 dims) | `503 EmbeddingServiceUnavailableError` |
| 11 | Persistir libro + autores + categorías + embedding (atómico) | `500 Internal Server Error` |

## Comportamiento de retry en traducción

El `OllamaTranslationService` implementa reintentos con **backoff exponencial**:

```
Intento 1 → falla → espera 1s
Intento 2 → falla → espera 2s
Intento 3 → falla → TranslationServiceUnavailableError
```

> **Nota**: Si el libro ya viene con `translatedDescription` (caso de carga masiva por script), se salta completamente el paso de traducción y se usa la descripción pre-proporcionada.
