# Design Doc: Library - Sistema de Gestión de Biblioteca Digital

## Metadata

| Campo | Valor |
|-------|-------|
| **Estado** | Aprobado |
| **Fecha** | 2026-02-22 |
| **Última actualización** | 2026-03-08 (Angular 21.2, LibreTranslate, BookIdentifier) |
| **Autor** | - |

---

## 1. Resumen Ejecutivo

**Library** es un sistema de gestión de biblioteca digital personal que permite catalogar, organizar y buscar libros digitales mediante búsqueda semántica potenciada por IA.

El sistema está diseñado para manejar una colección de aproximadamente **60.000 libros** con capacidad de crecimiento. Se compone de:

- **API REST** (Node.js/Fastify): Backend con búsqueda semántica y gestión de libros
- **Web Client** (Angular): Interfaz web responsive para búsqueda y envío a Kindle
- **Scripts de carga**: Importación de datos desde ficheros JSON

---

## 2. Motivación y Objetivos

### 2.1 Problema a Resolver

Gestionar una colección grande de libros digitales presenta varios desafíos:

1. **Búsqueda limitada**: Las búsquedas tradicionales por título/autor no encuentran libros cuando el usuario describe lo que busca con sus propias palabras
2. **Catalogación manual**: Mantener metadatos consistentes requiere un sistema centralizado
3. **Acceso centralizado**: Necesidad de una interfaz web intuitiva para gestionar la biblioteca

### 2.2 Objetivos del Proyecto

- Almacenar metadatos de libros digitales de forma estructurada
- Permitir búsqueda semántica mediante embeddings (el usuario describe lo que busca en lenguaje natural)
- Cargar datos iniciales desde ficheros JSON consolidados
- Exponer API REST para integración con cliente web
- Proporcionar interfaz web intuitiva para búsqueda y envío de libros a Kindle
- **Costo operativo mínimo o nulo** (proyecto personal)
- Arquitectura mantenible y extensible

---

## 3. Modelo de Dominio

### 3.1 Entidad Principal: Book

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `isbn` | BookIdentifier | No | Identificador flexible del libro (ISBN-10, ISBN-13, ASIN, etc. — max 32 chars, único cuando presente) |
| `title` | string | Sí | Título del libro (max 500) |
| `authors` | Author[] | Sí | Lista de autores (mínimo 1) - Relación N:M |
| `originalDescription` | string | Sí | Descripción en el idioma original (max 25000) |
| `description` | string | Sí | Descripción siempre en español (max 25000) |
| `language` | string | Sí | Código ISO 639-1 del idioma original (ej: 'en', 'es') |
| `type` | BookType | Sí | Referencia a entidad Type - Relación N:1 |
| `categories` | Category[] | Sí | Lista de categorías (1-10) - Relación N:M |
| `format` | BookFormat | Sí | Formato del archivo (enum) |
| `level` | Level | No | Referencia a entidad Level - Relación N:1 |
| `available` | boolean | Sí | Indica si el libro está disponible (default: false) |
| `path` | string | No | Ruta del archivo (max 1000) |
| `embedding` | vector | No | Vector 768 dimensiones |
| `createdAt` | timestamp | Sí | Fecha de creación |
| `updatedAt` | timestamp | Sí | Fecha de modificación |

> **Nota HU-013 / HU-026**: Las descripciones de libros se almacenan tanto en su idioma original (`originalDescription`) como traducidas al español (`description`). El campo `language` indica el idioma original usando códigos ISO 639-1. Las traducciones se realizan automáticamente durante la creación del libro usando **LibreTranslate** como proveedor primario (velocidad, carga masiva) y **Ollama + llama3.2:1b** como proveedor secundario (calidad, disponibilidad offline).

### 3.2 Entidad: Author

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `name` | string | Sí | Nombre del autor (único, max 300 chars) |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |
| `updatedAt` | timestamp | Sí | Fecha de última modificación |

### 3.3 Entidad: BookType

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `name` | string | Sí | Nombre del tipo (único, max 50 chars) |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |
| `updatedAt` | timestamp | Sí | Fecha de última modificación |

**Valores iniciales:** `technical`, `novel`, `biography`

### 3.4 Entidad: Category

Entidad para gestionar categorías de libros. Cada categoría pertenece a un tipo específico.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `name` | string | Sí | Nombre de la categoría (único por tipo, max 100 chars) |
| `typeId` | UUID | Sí | Referencia al tipo al que pertenece la categoría |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |
| `updatedAt` | timestamp | Sí | Fecha de última modificación |

### 3.5 Entidad: Level

Entidad para gestionar niveles de dificultad. Los niveles se crean dinámicamente y se asocian a tipos de libro.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `name` | string | Sí | Nombre del nivel (único, max 100 chars) |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |
| `updatedAt` | timestamp | Sí | Fecha de última modificación |

**Relación con Type**: N:M - Un nivel puede estar disponible para múltiples tipos, y un tipo puede tener múltiples niveles válidos. Se gestiona mediante tabla de unión `type_levels`.

### 3.6 Value Objects

- **BookFormat**: `epub` | `pdf` | `mobi` | `azw3` | `djvu` | `cbz` | `cbr` | `txt` | `other`
- **BookIdentifier**: Cadena alfanumérica de 1–32 caracteres (identificador flexible: ISBN-10, ISBN-13, ASIN, o cualquier otro identificador de libro). Introducido en HU-029 reemplazando el antiguo Value Object `ISBN`.

### 3.7 Entidad: User

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `email` | string | Sí | Email único del usuario |
| `passwordHash` | string | Sí | Hash bcrypt de la contraseña |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |

El `User` se relaciona con `Book` a través de dos tablas de unión:
- **`user_book_favorites`**: libros marcados como favoritos por el usuario (N:M)
- **`user_book_downloads`**: registro de libros enviados por email/Kindle (N:M con `downloaded_at`)

### 3.8 Relaciones

```
┌─────────────┐       N:M       ┌─────────────┐       N:1       ┌─────────────┐
│   Author    │◄───────────────►│    Book     │───────────────►│    Level    │
└─────────────┘                 └─────────────┘                 └─────────────┘
                                      │    ▲                          ▲
                                      │ N:1│                          │ N:M
                                      ▼   N:M (favorites/downloads)  │
                                ┌─────────────┐      ┌─────────────┐ │
                                │  BookType   │──────►│    User     │ │
                                └─────────────┘      └─────────────┘ │
                                      │                               │
                                      │ 1:N               ───────────┘
                                      ▼
                                ┌─────────────┐
                                │  Category   │
                                └─────────────┘
```

- **Book ↔ Author**: Relación muchos-a-muchos (N:M)
  - Un libro puede tener múltiples autores
  - Un autor puede tener múltiples libros
  - Se gestiona mediante tabla de unión `book_authors`

- **Book → BookType**: Relación muchos-a-uno (N:1)
  - Un libro tiene exactamente un tipo
  - Un tipo puede estar asociado a múltiples libros

- **Book ↔ Category**: Relación muchos-a-muchos (N:M)
  - Un libro puede tener múltiples categorías (máximo 10)
  - Una categoría puede estar asociada a múltiples libros
  - Se gestiona mediante tabla de unión `book_categories`

- **Book → Level**: Relación muchos-a-uno (N:1)
  - Un libro puede tener un nivel de dificultad (opcional)
  - Un nivel puede estar asociado a múltiples libros

- **BookType → Category**: Relación uno-a-muchos (1:N)
  - Una categoría pertenece a exactamente un tipo
  - Un tipo puede tener múltiples categorías asociadas

- **BookType ↔ Level**: Relación muchos-a-muchos (N:M)
  - Un tipo puede tener múltiples niveles válidos
  - Un nivel puede estar disponible para múltiples tipos
  - Se gestiona mediante tabla de unión `type_levels`
  - **Validación**: Al crear un libro, se valida que el level esté asociado al type

- **User ↔ Book (favoritos)**: Relación muchos-a-muchos (N:M)
  - Un usuario puede marcar múltiples libros como favoritos
  - Se gestiona mediante tabla de unión `user_book_favorites`

- **User ↔ Book (descargas)**: Relación muchos-a-muchos (N:M)
  - Un usuario puede descargar/enviar múltiples libros a Kindle
  - Se registra en `user_book_downloads` con timestamp `downloaded_at`

---

## 4. Arquitectura General del Sistema

### 4.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LIBRARY SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│   │     Web Client      │         │              API                     │   │
│   │     (Angular 21.2)    │ ◄─────► │         (Node.js/Fastify)            │   │
│   │                     │  HTTP   │                                      │   │
│   │  • Búsqueda libros  │  REST   │  • Búsqueda semántica               │   │
│   │  • Filtros          │         │  • CRUD libros                       │   │
│   │  • Detalle libro    │         │  • Gestión categorías/tipos/niveles │   │
│   │  • Envío a Kindle   │         │  • Envío email Kindle               │   │
│   │                     │         │                                      │   │
│   │  Puerto: 4200       │         │  Puerto: 3000                        │   │
│   └─────────────────────┘         └──────────────┬──────────────────────┘   │
│                                                   │                          │
│                                   ┌───────────────┼───────────────┐          │
│                                   │               │               │          │
│                                   ▼               ▼               ▼          │
│                           ┌───────────┐   ┌───────────┐   ┌───────────────┐  │
│                           │PostgreSQL │   │  Ollama   │   │ LibreTranslate│  │
│                           │+ pgvector │   │(embeddings)│  │  (traducciones│  │
│                           │           │   │           │   │   primario)   │  │
│                           │ Puerto:   │   │ nomic-    │   │ Puerto: 5000  │  │
│                           │ 5432      │   │ embed-text│   └───────────────┘  │
│                           └───────────┘   └───────────┘                      │
│                                                           ┌───────────────┐  │
│                                                           │    Ollama     │  │
│                                                           │ (traducciones │  │
│                                                           │  secundario)  │  │
│                                                           │ llama3.2:1b   │  │
│                                                           │ Puerto: 11435 │  │
│                                                           └───────────────┘  │
│                                                                               │
│                           ┌───────────────────────────────────────────┐      │
│                           │              Scripts                       │      │
│                           │  • seed-database.ts (carga inicial)       │      │
│                           │  • consolidate-books.ts (procesamiento)   │      │
│                           └───────────────────────────────────────────┘      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Componentes del Sistema

| Componente | Tecnología | Descripción | Design Doc |
|------------|------------|-------------|------------|
| **API** | Node.js 20, Fastify, TypeScript | Backend REST con arquitectura hexagonal y DDD | `02-project-structure.md` |
| **Web Client** | Angular 21.2, Signals, Tailwind CSS | Interfaz web responsive con Tailwind CSS | `03-web-client-design.md` |
| **Base de Datos** | PostgreSQL 16 + pgvector | Almacenamiento de datos y búsqueda vectorial | - |
| **Embeddings** | Ollama Embeddings + nomic-embed-text | Generación de embeddings para búsqueda semántica | - |
| **Traducciones (primario)** | LibreTranslate | Traducción automática rápida, usada en carga masiva | - |
| **Traducciones (secundario)** | Ollama Translations + llama3.2:1b | Traducción de calidad, disponibilidad offline | - |

### 4.3 Flujo de Datos Principal

```
Usuario                Web Client               API                    PostgreSQL
  │                        │                     │                          │
  │─── Busca "clean code"──►│                     │                          │
  │                        │──GET /api/books────►│                          │
  │                        │   ?text=clean+code  │                          │
  │                        │                     │───genera embedding──────►│
  │                        │                     │◄──vector 768 dims────────│
  │                        │                     │                          │
  │                        │                     │───búsqueda cosine────────►│
  │                        │                     │◄──libros similares───────│
  │                        │◄──JSON response─────│                          │
  │◄──Muestra resultados───│                     │                          │
  │                        │                     │                          │
  │─── Click en libro ────►│                     │                          │
  │                        │──GET /api/books/:id─►│                          │
  │                        │◄──JSON libro────────│                          │
  │◄──Muestra detalle─────│                     │                          │
```

---

## 5. Análisis de Alternativas Tecnológicas

### 5.1 Lenguaje de Programación

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **TypeScript/Node.js** | Tipado fuerte, excelente para APIs, gran ecosistema, familiaridad del desarrollador | Ecosistema ML menos maduro que Python | ✅ **Seleccionado** |
| Python | Rey del ecosistema ML/AI, muy maduro | Menor familiaridad del desarrollador | ❌ Descartado |
| Go | Alto rendimiento, binarios únicos | Ecosistema ML limitado, menor familiaridad | ❌ Descartado |

**Justificación**: TypeScript ofrece el mejor balance entre productividad, type-safety y familiaridad. El ecosistema de embeddings en Node.js es suficiente para este caso de uso gracias a Ollama.

---

### 5.2 Base de Datos

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **PostgreSQL + pgvector** | Una sola BD para datos + vectores, maduro, escalable, gratis | Requiere extensión pgvector | ✅ **Seleccionado** |
| SQLite + sqlite-vss | Embebido, sin servidor, simple | Menos escalable, extensión vectorial menos madura | ❌ Descartado |
| PostgreSQL + Pinecone | Pinecone optimizado para vectores | Pinecone tiene costos, complejidad adicional | ❌ Descartado |
| MongoDB + Atlas Vector | Flexible, Atlas tiene vector search | Costos en cloud, overkill para este caso | ❌ Descartado |
| Qdrant / Milvus | Optimizados para vectores | BD adicional que mantener, complejidad | ❌ Descartado |

**Justificación**: PostgreSQL + pgvector permite mantener TODO en una sola base de datos. Para 60k registros (e incluso millones), pgvector con índices HNSW o IVFFlat ofrece rendimiento excelente. Es 100% gratis y corre perfectamente en Docker.

---

### 5.3 Servicio de Embeddings

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Ollama + nomic-embed-text** | 100% gratis, local, corre en CPU, modelo liviano (~274MB) | Requiere recursos locales | ✅ **Seleccionado** |
| OpenAI Embeddings API | Alta calidad, fácil integración | Costo por uso, dependencia externa | ❌ Descartado |
| Cohere Embed API | Buena calidad, free tier | Free tier limitado, dependencia externa | ❌ Descartado |
| Hugging Face Inference | Free tier generoso | Latencia variable, límites de uso | 🔄 Alternativa futura |
| sentence-transformers (Python) | Muy maduro | Requiere Python, mayor complejidad | ❌ Descartado |

**Justificación**: Ollama permite ejecutar modelos de embedding localmente sin costo. El modelo `nomic-embed-text` es liviano, corre en CPU sin problemas, y produce embeddings de 768 dimensiones con excelente calidad para búsqueda semántica. Hugging Face Inference se mantiene como alternativa cloud si se necesita en el futuro.

---

### 5.4 Framework HTTP (API)

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Fastify** | Más rápido que Express, excelente DX, schema validation nativo, TypeScript first | Menor adopción que Express | ✅ **Seleccionado** |
| Express | Más popular, más recursos | Más lento, menos features nativos | ❌ Descartado |
| NestJS | Arquitectura robusta, DI nativo | Opinionated, overkill para este proyecto | ❌ Descartado |
| Hono | Ultra rápido, edge-ready | Ecosistema más pequeño | ❌ Descartado |

**Justificación**: Fastify ofrece el mejor rendimiento, tiene validación de schemas integrada (compatible con Zod), y excelente soporte de TypeScript. Su arquitectura basada en plugins facilita la organización del código.

---

### 5.5 ORM / Query Builder

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Drizzle ORM** | Type-safe, ligero, SQL-like, soporta pgvector | Más nuevo, menos recursos | ✅ **Seleccionado** |
| Prisma | Popular, buena DX, migraciones | Más pesado, soporte pgvector limitado | ❌ Descartado |
| TypeORM | Maduro, decoradores | Problemas de tipos, pesado | ❌ Descartado |
| Kysely | Type-safe, query builder puro | Sin ORM features, pgvector manual | ❌ Descartado |

**Justificación**: Drizzle ORM ofrece type-safety excelente, es muy ligero, y su sintaxis SQL-like facilita queries complejas. Tiene buen soporte para extensiones de PostgreSQL como pgvector.

---

### 5.6 Validación

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Zod** | TypeScript-first, inferencia de tipos, composable | - | ✅ **Seleccionado** |
| Joi | Maduro, popular | No TypeScript-first | ❌ Descartado |
| Yup | Similar a Zod | Menos features, menos mantenido | ❌ Descartado |
| class-validator | Decoradores | Requiere clases, menos flexible | ❌ Descartado |

**Justificación**: Zod permite definir schemas que sirven tanto para validación runtime como para inferir tipos TypeScript. Integra perfectamente con Fastify y Drizzle.

---

### 5.7 Testing

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Vitest** | Rápido, compatible con Jest API, ESM nativo, TypeScript nativo | Más nuevo | ✅ **Seleccionado** |
| Jest | Estándar de facto, maduro | Configuración ESM compleja, más lento | ❌ Descartado |
| Node Test Runner | Nativo, sin dependencias | Menos features, menos maduro | ❌ Descartado |

**Justificación**: Vitest ofrece la misma API familiar de Jest pero con rendimiento muy superior y soporte nativo de TypeScript y ESM sin configuración adicional.

---

## 6. Stack Tecnológico Final

### 6.1 API (Backend)

| Componente | Tecnología |
|------------|------------|
| **Lenguaje** | TypeScript 5.x |
| **Runtime** | Node.js 20 LTS |
| **Base de datos** | PostgreSQL 16 + pgvector |
| **Embeddings** | Ollama Embeddings + nomic-embed-text |
| **Traducciones (primario)** | LibreTranslate |
| **Traducciones (secundario)** | Ollama Translations + llama3.2:1b |
| **Framework HTTP** | Fastify 4.x |
| **ORM** | Drizzle ORM |
| **Validación** | Zod |
| **Testing** | Vitest |
| **Containerización** | Docker + Docker Compose |

### 6.2 Web Client (Frontend)

| Componente | Tecnología |
|------------|------------|
| **Framework** | Angular 21.2.x |
| **Lenguaje** | TypeScript 5.x |
| **State Management** | Angular Signals |
| **Estilos** | Tailwind CSS |
| **UI Components** | Componentes propios con Tailwind |
| **Component Docs** | Storybook 8.x |
| **Testing Unit** | Vitest + Angular Testing Library |
| **Testing E2E** | Playwright |
| **Build Tool** | Angular CLI (esbuild) |
| **Servidor** | Nginx (en Docker) |

---

## 7. Estimación de Costos

| Componente | Costo (Desarrollo) | Costo (Producción VPS) |
|------------|-------------------|------------------------|
| PostgreSQL + pgvector | $0 | $0 (incluido en VPS) |
| Ollama + nomic-embed-text | $0 | $0 |
| LibreTranslate (self-hosted) | $0 | $0 |
| Node.js + TypeScript | $0 | $0 |
| Docker | $0 | $0 |
| **VPS** | N/A | ~$5-10/mes (Hetzner/Contabo) |
| **TOTAL** | **$0** | **~$5-10/mes** |

---

## 8. Requisitos No Funcionales

- **Portabilidad**: Todo el sistema debe correr en contenedores Docker
- **Desarrollo local**: Debe poder ejecutarse completamente en máquina local
- **Rendimiento API**: Búsquedas semánticas < 500ms para 60k registros
- **Rendimiento Web**: Time to Interactive < 3s en conexión 3G
- **Responsive**: Web Client debe funcionar en desktop y mobile
- **Extensibilidad**: Arquitectura que permita añadir nuevos adaptadores (ej: GraphQL, gRPC)

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Ollama no disponible | Baja | Alto | Implementar adapter alternativo para HuggingFace |
| pgvector lento con muchos registros | Baja | Medio | Usar índices HNSW, particionar si necesario |
| Modelo de embeddings obsoleto | Media | Bajo | Arquitectura permite cambiar modelo fácilmente |

---

## 10. Referencias

### Backend

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Ollama](https://ollama.ai/)
- [nomic-embed-text](https://huggingface.co/nomic-ai/nomic-embed-text-v1)
- [Fastify](https://www.fastify.io/)
- [Drizzle ORM](https://orm.drizzle.team/)

### Frontend

- [Angular 21.2 Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Storybook](https://storybook.js.org/)
- [Playwright](https://playwright.dev)
- [Vitest](https://vitest.dev)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/)
