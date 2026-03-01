# HU-023: Diagramas de Arquitectura del Sistema

## Descripción

**Como** desarrollador o arquitecto del proyecto,  
**Quiero** disponer de diagramas visuales del sistema generados en sintaxis Mermaid,  
**Para** comprender de un vistazo cómo está construido el sistema a nivel de infraestructura y cómo está diseñado cada servicio a nivel de arquitectura de software.

## Contexto

El proyecto ha crecido hasta contar con múltiples servicios Docker, una API con arquitectura hexagonal estricta, un cliente Angular con arquitectura basada en features y flujos de negocio complejos (traducción automática + generación de embeddings). Actualmente no existe ninguna representación visual de la arquitectura del sistema. Disponer de diagramas en sintaxis Mermaid, embebidos en Markdown, facilitará el onboarding de nuevos desarrolladores, la comunicación entre equipos y la toma de decisiones técnicas.

Los diagramas se generarán en el directorio `docs/diagrams/` y quedarán como documentación viva del proyecto.

## Documentación Relacionada

- **Afectación**: `docs/diagrams/` (nuevo directorio)
- **Referencia técnica**: `docs/design_docs/01-project-overview.md`, `docs/design_docs/04-api-design.md`, `docs/design_docs/03-web-client-design.md`
- **Infraestructura**: `docker-compose.yml`

---

## Criterios de Aceptación

### AC-1: Diagrama de Infraestructura — Servicios del Sistema

- [ ] Se genera un diagrama que representa los 5 contenedores Docker del sistema (`library-api-dev`, `library-web-client`, `library-postgres`, `library-ollama-embeddings`, `library-ollama-translations`).
- [ ] El diagrama muestra los puertos expuestos por cada servicio.
- [ ] El diagrama refleja las dependencias y comunicaciones entre servicios (quién llama a quién, protocolo HTTP/TCP).
- [ ] Se indica la tecnología base de cada servicio (imagen, lenguaje o framework).
- [ ] Sintaxis Mermaid: `graph TD` o `C4Context`.

### AC-2: Diagrama de Arquitectura de Software — API (Hexagonal + DDD)

- [ ] Se genera un diagrama que representa las 3 capas de la arquitectura hexagonal: `Domain`, `Application` e `Infrastructure`.
- [ ] El diagrama incluye los componentes clave de cada capa: entidades, value objects, puertos (interfaces), casos de uso y adaptadores (driven/driver).
- [ ] La dirección de las dependencias es correcta: `Infrastructure → Application → Domain` (nunca al revés).
- [ ] Sintaxis Mermaid: `graph LR`.

### AC-3: Diagrama de Arquitectura de Software — Web Client (Angular)

- [ ] Se genera un diagrama que representa la estructura de features del cliente Angular (`core`, `catalog`, `kindle`, `shared`, `layout`).
- [ ] El diagrama incluye los servicios principales (`ApiService`, `BookService`, `BookSearchStore`) y su relación con los componentes.
- [ ] Se refleja el patrón de estado reactivo con Angular Signals (`BookSearchStore`).
- [ ] Se representa la comunicación del cliente con la API REST.
- [ ] Sintaxis Mermaid: `graph TD`.

### AC-4: Diagrama de Flujo — Creación de un Libro (Flujo End-to-End)

- [ ] Se genera un diagrama de secuencia que representa el flujo completo de creación de un libro.
- [ ] El flujo incluye: petición HTTP → Controller → Use Case → Domain → TranslationService → EmbeddingService → Repository → PostgreSQL.
- [ ] Se representan los puntos de error (servicio de traducción no disponible, servicio de embedding no disponible) y la lógica de retry del `OllamaTranslationService`.
- [ ] Sintaxis Mermaid: `sequenceDiagram`.

### AC-5: Documento índice de diagramas

- [ ] Se crea un documento `docs/diagrams/README.md` que actúa como índice, con una breve descripción de cada diagrama y un enlace al archivo correspondiente.

---

## Tareas de Implementación

### Tarea 1: Diagrama de Infraestructura — Servicios del Sistema

**Estimación**: 1 hora  
**Branch**: `task/HU-023-01-infrastructure-diagram`

- [ ] Crear el archivo `docs/diagrams/01-infrastructure.md`.
- [ ] Generar el diagrama Mermaid con los 5 servicios Docker, sus puertos, tecnologías y dependencias.
- [ ] Incluir una breve descripción del diagrama.

### Tarea 2: Diagrama de Arquitectura — API Hexagonal

**Estimación**: 1.5 horas  
**Branch**: `task/HU-023-02-api-architecture-diagram`

- [ ] Crear el archivo `docs/diagrams/02-api-architecture.md`.
- [ ] Generar el diagrama Mermaid con las 3 capas hexagonales, sus componentes y la dirección de dependencias.
- [ ] Incluir una breve descripción del diagrama.

### Tarea 3: Diagrama de Arquitectura — Web Client Angular

**Estimación**: 1 hora  
**Branch**: `task/HU-023-03-webclient-architecture-diagram`

- [ ] Crear el archivo `docs/diagrams/03-webclient-architecture.md`.
- [ ] Generar el diagrama Mermaid con la estructura de features, servicios, estado y comunicación con la API.
- [ ] Incluir una breve descripción del diagrama.

### Tarea 4: Diagrama de Flujo — Creación de un Libro

**Estimación**: 1.5 horas  
**Branch**: `task/HU-023-04-book-creation-flow-diagram`

- [ ] Crear el archivo `docs/diagrams/04-book-creation-flow.md`.
- [ ] Generar el diagrama de secuencia Mermaid con el flujo completo, incluyendo puntos de error y retry.
- [ ] Incluir una breve descripción del diagrama.

### Tarea 5: Documento índice de diagramas

**Estimación**: 30 minutos  
**Branch**: `task/HU-023-05-diagrams-index`

- [ ] Crear el archivo `docs/diagrams/README.md` con el índice de todos los diagramas generados.
- [ ] Incluir descripción breve y enlace a cada diagrama.

---

## Definition of Done

- ✅ Los 4 diagramas Mermaid están generados y son válidos (renderizan correctamente).
- ✅ Cada diagrama refleja el estado actual del sistema (no estados futuros).
- ✅ El documento índice `docs/diagrams/README.md` está creado y enlaza todos los diagramas.
- ✅ Commits realizados con el estándar Conventional Commits.
- ✅ 0 errores de lint, 0 errores de tipo.

---

**Historia creada**: Domingo, 1 de Marzo, 2026  
**Estimación**: 5.5 horas  
**Prioridad**: Media  
**Complejidad**: Media
