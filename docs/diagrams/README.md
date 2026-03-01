# Diagramas de Arquitectura — Library

Este directorio contiene los diagramas de arquitectura del sistema **Library**, generados en sintaxis [Mermaid](https://mermaid.js.org/) y embebidos en Markdown para su visualización directa en GitHub u otros visores compatibles.

Los diagramas reflejan el **estado actual del sistema** y deben actualizarse cuando se produzcan cambios estructurales significativos en la arquitectura.

---

## Índice de diagramas

### [01 — Infraestructura: Servicios del Sistema](./01-infrastructure.md)

Representa los **5 contenedores Docker** que componen el sistema en entorno de desarrollo, sus tecnologías base, los puertos expuestos al host y las dependencias de comunicación entre ellos dentro de la red Docker interna `library-network`.

- **Tipo**: `graph TD`
- **Servicios**: `library-api-dev`, `library-web-client`, `library-postgres`, `library-ollama-embeddings`, `library-ollama-translations`
- **Referencia**: `docker-compose.yml`

---

### [02 — Arquitectura de Software: API Hexagonal + DDD](./02-api-architecture.md)

Representa la arquitectura interna de la API REST, construida con **Arquitectura Hexagonal (Ports & Adapters)** y **Domain-Driven Design (DDD)**. Muestra las 3 capas (Domain, Application, Infrastructure), sus componentes clave y la dirección de dependencias.

- **Tipo**: `graph LR`
- **Capas**: Domain → Application → Infrastructure (Driver + Driven)
- **Referencia**: `apps/api/src/`

---

### [03 — Arquitectura de Software: Web Client Angular](./03-webclient-architecture.md)

Representa la arquitectura interna del cliente web Angular 21. Muestra la organización por **features** (Screaming Architecture), los servicios singleton del módulo `core`, el patrón de estado reactivo con **Angular Signals** (`BookSearchStore`) y la comunicación con la API REST.

- **Tipo**: `graph TD`
- **Features**: `core`, `catalog`, `kindle`, `layout`, `shared`
- **Referencia**: `apps/web-client/src/`

---

### [04 — Flujo: Creación de un Libro (End-to-End)](./04-book-creation-flow.md)

Diagrama de secuencia del flujo más complejo del sistema: creación de un libro desde el `POST /api/books` hasta la persistencia final. Incluye validaciones de dominio, traducción automática a español (`llama3.2:1b`), generación de embeddings vectoriales (`nomic-embed-text`, 768 dims) y los puntos de error con sus respuestas HTTP.

- **Tipo**: `sequenceDiagram`
- **Involucra**: BooksController → CreateBookUseCase → Domain → OllamaTranslationService (con retry) → OllamaEmbeddingService → PostgresBookRepository → PostgreSQL
- **Referencia**: `apps/api/src/application/use-cases/CreateBookUseCase.ts`

---

## Convenciones

| Elemento | Descripción |
|---|---|
| Flechas sólidas `→` | Flujo de llamadas / dependencias de uso |
| Flechas punteadas `-.->` | Implementación de interfaces (Dependency Inversion) |
| Flechas de secuencia `->>` | Llamada (mensajes síncronos o asíncronos) |
| Flechas de retorno `-->>` | Respuesta |

## Herramientas para visualizar

Los diagramas Mermaid se renderizan automáticamente en:
- **GitHub** (vista de archivos Markdown)
- **VS Code** con extensión [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
- **[mermaid.live](https://mermaid.live)** (editor online)
