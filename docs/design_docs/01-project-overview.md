# Design Doc: Library - Sistema de Gestión de Biblioteca Digital

## Metadata

| Campo | Valor |
|-------|-------|
| **Estado** | Aprobado |
| **Fecha** | 2026-01-31 |
| **Autor** | - |

---

## 1. Resumen Ejecutivo

**Library** es un sistema de gestión de biblioteca digital personal que permite catalogar, organizar y buscar libros digitales mediante búsqueda semántica potenciada por IA.

El sistema está diseñado para manejar una colección de aproximadamente **60.000 libros** con capacidad de crecimiento, ofreciendo una **API REST** para clientes web y scripts de carga de datos desde ficheros JSON.

---

## 2. Motivación y Objetivos

### 2.1 Problema a Resolver

Gestionar una colección grande de libros digitales presenta varios desafíos:

1. **Búsqueda limitada**: Las búsquedas tradicionales por título/autor no encuentran libros cuando el usuario describe lo que busca con sus propias palabras
2. **Catalogación manual**: Mantener metadatos consistentes requiere un sistema centralizado
3. **Acceso múltiple**: Necesidad de acceder tanto desde terminal (automatización, scripts) como desde aplicaciones web

### 2.2 Objetivos del Proyecto

- Almacenar metadatos de libros digitales de forma estructurada
- Permitir búsqueda semántica mediante embeddings (el usuario describe lo que busca en lenguaje natural)
- Cargar datos iniciales desde ficheros JSON consolidados
- Exponer API REST para integración con clientes web
- **Costo operativo mínimo o nulo** (proyecto personal)
- Arquitectura mantenible y extensible

---

## 3. Modelo de Dominio

### 3.1 Entidad Principal: Book

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `isbn` | ISBN | No | ISBN del libro (único cuando presente) |
| `title` | string | Sí | Título del libro (max 500) |
| `authors` | Author[] | Sí | Lista de autores (mínimo 1) - Relación N:M |
| `description` | string | Sí | Sinopsis del contenido (max 5000) |
| `type` | BookType | Sí | Referencia a entidad Type - Relación N:1 |
| `categories` | Category[] | Sí | Lista de categorías (1-10) - Relación N:M |
| `format` | BookFormat | Sí | Formato del archivo (enum) |
| `available` | boolean | Sí | Indica si el libro está disponible (default: false) |
| `path` | string | No | Ruta del archivo (max 1000) |
| `embedding` | vector | No | Vector 768 dimensiones |
| `createdAt` | timestamp | Sí | Fecha de creación |
| `updatedAt` | timestamp | Sí | Fecha de modificación |

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

Entidad independiente para gestionar categorías reutilizables.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único generado por el sistema |
| `name` | string | Sí | Nombre de la categoría (único, max 100 chars) |
| `description` | string | No | Descripción de la categoría (max 500 chars) |
| `createdAt` | timestamp | Sí | Fecha de creación del registro |
| `updatedAt` | timestamp | Sí | Fecha de última modificación |

### 3.5 Value Objects

- **BookFormat**: `epub` | `pdf` | `mobi` | `azw3` | `djvu` | `cbz` | `cbr` | `txt` | `other`
- **ISBN**: Validado (ISBN-10 o ISBN-13), normalizado sin guiones

### 3.6 Relaciones

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

---

## 4. Análisis de Alternativas Tecnológicas

### 4.1 Lenguaje de Programación

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **TypeScript/Node.js** | Tipado fuerte, excelente para APIs, gran ecosistema, familiaridad del desarrollador | Ecosistema ML menos maduro que Python | ✅ **Seleccionado** |
| Python | Rey del ecosistema ML/AI, muy maduro | Menor familiaridad del desarrollador | ❌ Descartado |
| Go | Alto rendimiento, binarios únicos | Ecosistema ML limitado, menor familiaridad | ❌ Descartado |

**Justificación**: TypeScript ofrece el mejor balance entre productividad, type-safety y familiaridad. El ecosistema de embeddings en Node.js es suficiente para este caso de uso gracias a Ollama.

---

### 4.2 Base de Datos

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **PostgreSQL + pgvector** | Una sola BD para datos + vectores, maduro, escalable, gratis | Requiere extensión pgvector | ✅ **Seleccionado** |
| SQLite + sqlite-vss | Embebido, sin servidor, simple | Menos escalable, extensión vectorial menos madura | ❌ Descartado |
| PostgreSQL + Pinecone | Pinecone optimizado para vectores | Pinecone tiene costos, complejidad adicional | ❌ Descartado |
| MongoDB + Atlas Vector | Flexible, Atlas tiene vector search | Costos en cloud, overkill para este caso | ❌ Descartado |
| Qdrant / Milvus | Optimizados para vectores | BD adicional que mantener, complejidad | ❌ Descartado |

**Justificación**: PostgreSQL + pgvector permite mantener TODO en una sola base de datos. Para 60k registros (e incluso millones), pgvector con índices HNSW o IVFFlat ofrece rendimiento excelente. Es 100% gratis y corre perfectamente en Docker.

---

### 4.3 Servicio de Embeddings

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Ollama + nomic-embed-text** | 100% gratis, local, corre en CPU, modelo liviano (~274MB) | Requiere recursos locales | ✅ **Seleccionado** |
| OpenAI Embeddings API | Alta calidad, fácil integración | Costo por uso, dependencia externa | ❌ Descartado |
| Cohere Embed API | Buena calidad, free tier | Free tier limitado, dependencia externa | ❌ Descartado |
| Hugging Face Inference | Free tier generoso | Latencia variable, límites de uso | 🔄 Alternativa futura |
| sentence-transformers (Python) | Muy maduro | Requiere Python, mayor complejidad | ❌ Descartado |

**Justificación**: Ollama permite ejecutar modelos de embedding localmente sin costo. El modelo `nomic-embed-text` es liviano, corre en CPU sin problemas, y produce embeddings de 768 dimensiones con excelente calidad para búsqueda semántica. Hugging Face Inference se mantiene como alternativa cloud si se necesita en el futuro.

---

### 4.4 Framework HTTP

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Fastify** | Más rápido que Express, excelente DX, schema validation nativo, TypeScript first | Menor adopción que Express | ✅ **Seleccionado** |
| Express | Más popular, más recursos | Más lento, menos features nativos | ❌ Descartado |
| NestJS | Arquitectura robusta, DI nativo | Opinionated, overkill para este proyecto | ❌ Descartado |
| Hono | Ultra rápido, edge-ready | Ecosistema más pequeño | ❌ Descartado |

**Justificación**: Fastify ofrece el mejor rendimiento, tiene validación de schemas integrada (compatible con Zod), y excelente soporte de TypeScript. Su arquitectura basada en plugins facilita la organización del código.

---

### 4.5 ORM / Query Builder

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Drizzle ORM** | Type-safe, ligero, SQL-like, soporta pgvector | Más nuevo, menos recursos | ✅ **Seleccionado** |
| Prisma | Popular, buena DX, migraciones | Más pesado, soporte pgvector limitado | ❌ Descartado |
| TypeORM | Maduro, decoradores | Problemas de tipos, pesado | ❌ Descartado |
| Kysely | Type-safe, query builder puro | Sin ORM features, pgvector manual | ❌ Descartado |

**Justificación**: Drizzle ORM ofrece type-safety excelente, es muy ligero, y su sintaxis SQL-like facilita queries complejas. Tiene buen soporte para extensiones de PostgreSQL como pgvector.

---

### 4.6 Validación

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Zod** | TypeScript-first, inferencia de tipos, composable | - | ✅ **Seleccionado** |
| Joi | Maduro, popular | No TypeScript-first | ❌ Descartado |
| Yup | Similar a Zod | Menos features, menos mantenido | ❌ Descartado |
| class-validator | Decoradores | Requiere clases, menos flexible | ❌ Descartado |

**Justificación**: Zod permite definir schemas que sirven tanto para validación runtime como para inferir tipos TypeScript. Integra perfectamente con Fastify y Drizzle.

---

### 4.7 Testing

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Vitest** | Rápido, compatible con Jest API, ESM nativo, TypeScript nativo | Más nuevo | ✅ **Seleccionado** |
| Jest | Estándar de facto, maduro | Configuración ESM compleja, más lento | ❌ Descartado |
| Node Test Runner | Nativo, sin dependencias | Menos features, menos maduro | ❌ Descartado |

**Justificación**: Vitest ofrece la misma API familiar de Jest pero con rendimiento muy superior y soporte nativo de TypeScript y ESM sin configuración adicional.

---

## 5. Stack Tecnológico Final

| Componente | Tecnología |
|------------|------------|
| **Lenguaje** | TypeScript 5.x |
| **Runtime** | Node.js 20 LTS |
| **Base de datos** | PostgreSQL 16 + pgvector |
| **Embeddings** | Ollama + nomic-embed-text |
| **Framework HTTP** | Fastify 4.x |
| **ORM** | Drizzle ORM |
| **Validación** | Zod |
| **Testing** | Vitest |
| **Containerización** | Docker + Docker Compose |

---

## 6. Estimación de Costos

| Componente | Costo (Desarrollo) | Costo (Producción VPS) |
|------------|-------------------|------------------------|
| PostgreSQL + pgvector | $0 | $0 (incluido en VPS) |
| Ollama + nomic-embed-text | $0 | $0 |
| Node.js + TypeScript | $0 | $0 |
| Docker | $0 | $0 |
| **VPS** | N/A | ~$5-10/mes (Hetzner/Contabo) |
| **TOTAL** | **$0** | **~$5-10/mes** |

---

## 7. Requisitos No Funcionales

- **Portabilidad**: Todo el sistema debe correr en contenedores Docker
- **Desarrollo local**: Debe poder ejecutarse completamente en máquina local
- **Rendimiento**: Búsquedas semánticas < 500ms para 60k registros
- **Extensibilidad**: Arquitectura que permita añadir nuevos adaptadores (ej: GraphQL, gRPC)

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Ollama no disponible | Baja | Alto | Implementar adapter alternativo para HuggingFace |
| pgvector lento con muchos registros | Baja | Medio | Usar índices HNSW, particionar si necesario |
| Modelo de embeddings obsoleto | Media | Bajo | Arquitectura permite cambiar modelo fácilmente |

---

## 9. Referencias

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Ollama](https://ollama.ai/)
- [nomic-embed-text](https://huggingface.co/nomic-ai/nomic-embed-text-v1)
- [Fastify](https://www.fastify.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
