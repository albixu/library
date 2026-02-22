# Library 📚

Sistema de gestión de biblioteca digital personal con búsqueda semántica potenciada por IA.

## Descripción

**Library** te permite catalogar, organizar y buscar tu colección de libros digitales usando lenguaje natural. En lugar de buscar por título exacto o autor, puedes escribir cosas como:

- *"libros sobre inteligencia artificial para principiantes"*
- *"novelas de ciencia ficción con viajes en el tiempo"*
- *"guías prácticas de programación en Python"*

El sistema usa embeddings (representaciones vectoriales del texto) para entender el significado semántico de tu búsqueda y encontrar los libros más relevantes.

## Características

- 🔍 **Búsqueda semántica**: Encuentra libros describiendo lo que buscas en lenguaje natural
- 🌐 **API REST**: Integra con cualquier cliente web
- 📦 **Carga de datos automática**: Importa libros desde archivos JSON
- 🐳 **Dockerizado**: Todo el sistema corre en contenedores
- 💰 **Costo $0**: Usa tecnologías 100% gratuitas y open source

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Lenguaje | TypeScript + Node.js 20 |
| Base de datos | PostgreSQL 16 + pgvector |
| Embeddings | Ollama + nomic-embed-text |
| Traducciones | Ollama + qwen2.5:3b |
| API | Fastify |
| ORM | Drizzle ORM |
| Testing | Vitest |

## Requisitos Previos

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)
- [Node.js](https://nodejs.org/) (v20+) - Solo para desarrollo local sin Docker

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd library
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp apps/api-cli/.env.example apps/api-cli/.env

# Editar si es necesario (los valores por defecto funcionan para desarrollo)
```

### 3. Iniciar los contenedores (Desarrollo)

```bash
# Iniciar todos los servicios
docker-compose up -d

# Verificar que todo está corriendo
docker-compose ps
```

### 4. Descargar los modelos de Ollama

```bash
# Esto solo es necesario la primera vez
# Modelo para embeddings (búsqueda semántica)
docker exec library-ollama ollama pull nomic-embed-text

# Modelo para traducciones (descripción de libros)
docker exec library-ollama ollama pull qwen2.5:3b
```

### 5. Ejecutar migraciones de base de datos

```bash
# Entrar al contenedor de la API
docker exec -it library-api-dev sh

# Ejecutar migraciones
npm run db:migrate
```

¡Listo! La API está disponible en `http://localhost:3000`

## Carga de Datos Inicial

### Consolidar archivos JSON

Si tienes múltiples archivos JSON con datos de libros, puedes consolidarlos en un único archivo:

```bash
# Desde el contenedor
docker exec -it library-api-dev npm run consolidate:books

# Los archivos fuente deben estar en original_data/ (raíz del proyecto)
# El script excluye libros que ya existen en la base de datos (por ISBN)
# El resultado se guarda en docs/db/books.json
```

### Sembrar la base de datos

Para cargar los libros consolidados en la base de datos:

```bash
# Ejecución manual
docker exec -it library-api-dev npm run seed:database

# Variables de entorno opcionales:
# BATCH_SIZE=50      - Libros a procesar por lote
# MAX_RETRIES=3      - Reintentos en caso de error de embedding
```

### Carga automática al iniciar

Puedes configurar la carga automática de datos al iniciar el contenedor:

```bash
# En docker-compose.yml o .env
AUTO_SEED=true

# Solo cargará datos si la base de datos está vacía
```

## Uso

### API REST

#### Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/books` | Crear un nuevo libro |
| `GET` | `/api/books` | Buscar libros (filtros, paginación, búsqueda semántica) |
| `GET` | `/api/book-types` | Listar tipos de libro |
| `GET` | `/api/book-categories` | Listar categorías (filtrable por tipo) |
| `GET` | `/api/book-levels` | Listar niveles de dificultad (filtrable por tipo) |

#### Crear un libro

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean Code",
    "authors": ["Robert C. Martin"],
    "description": "A handbook of agile software craftsmanship",
    "type": "technical",
    "categories": ["programming"],
    "format": "pdf",
    "level": "Intermediate"
  }'
```

#### Listar tipos de libro

```bash
curl http://localhost:3000/api/book-types
```

#### Listar categorías

```bash
# Todas las categorías
curl http://localhost:3000/api/book-categories

# Filtrar por tipo de libro
curl "http://localhost:3000/api/book-categories?type=technical"
```

#### Listar niveles de dificultad

```bash
# Todos los niveles
curl http://localhost:3000/api/book-levels

# Filtrar por tipo de libro
curl "http://localhost:3000/api/book-levels?type=technical"
```

#### Buscar libros

```bash
# Búsqueda por título (parcial, case-insensitive)
curl "http://localhost:3000/api/books?title=Clean"

# Búsqueda por autor
curl "http://localhost:3000/api/books?author=Martin"

# Filtrar por tipo y categoría
curl "http://localhost:3000/api/books?types=technical&categories=programming"

# Búsqueda semántica (lenguaje natural)
curl "http://localhost:3000/api/books?text=libros+sobre+arquitectura+de+software"

# Paginación
curl "http://localhost:3000/api/books?limit=20"
curl "http://localhost:3000/api/books?limit=20&cursor=<token_de_pagina_anterior>"

# Combinando filtros
curl "http://localhost:3000/api/books?types=technical&levels=Intermediate&limit=10"
```

> **Nota**: La búsqueda semántica (`text`) genera embeddings del texto y encuentra libros con similaridad ≥70%. Los resultados incluyen `similarityScore`.

#### Formato de respuesta

Todas las respuestas siguen el formato estandarizado:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

En caso de error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Error description",
    "details": ["field: validation error"]
  }
}
```

## Desarrollo

### Estructura del proyecto

```
library/
├── apps/
│   ├── api-cli/          # Backend: API REST + Scripts
│   │   ├── src/
│   │   │   ├── domain/           # Lógica de negocio pura
│   │   │   ├── application/      # Casos de uso
│   │   │   ├── infrastructure/   # Adaptadores (DB, HTTP)
│   │   │   └── shared/           # Utilidades compartidas
│   │   ├── scripts/              # Consolidación y seeding
│   │   ├── tests/
│   │   └── docker/
│   │
│   └── web-client/       # Frontend (futuro)
│
├── docker-compose.yml        # Desarrollo
├── docker-compose.prod.yml   # Producción
└── docs/
    ├── api/                  # OpenAPI spec
    └── design_docs/          # Documentación de diseño
```

### Comandos de desarrollo

#### Docker

```bash
# Iniciar todos los contenedores
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f api

# Ver logs de todos los servicios
docker-compose logs -f

# Reiniciar solo la API
docker-compose restart api

# Detener todo
docker-compose down

# Detener y eliminar volúmenes (⚠️ borra datos de BD)
docker-compose down -v

# Reconstruir imagen de la API
docker-compose build api
```

#### Tests

```bash
# Tests unitarios
docker exec library-api-dev npm test

# Tests en modo watch (re-ejecuta al detectar cambios)
docker exec library-api-dev npm run test:watch

# Tests de integración (requiere PostgreSQL + Ollama)
docker exec library-api-dev npm run test:integration

# Tests end-to-end (HTTP)
docker exec library-api-dev npm run test:e2e

# TODOS los tests (unit + integration + e2e)
docker exec library-api-dev npm run test:all

# Tests con reporte de cobertura
docker exec library-api-dev npm run test:coverage

# Tests con interfaz gráfica
docker exec library-api-dev npm run test:ui

# Test específico
docker exec library-api-dev npx vitest run tests/unit/domain/entities/Book.test.ts
```

#### Lint y TypeScript

```bash
# Ejecutar linter
docker exec library-api-dev npm run lint

# Ejecutar linter con auto-fix
docker exec library-api-dev npm run lint:fix

# Verificar tipos TypeScript (sin emitir archivos)
docker exec library-api-dev npm run typecheck
```

#### Base de Datos (Drizzle)

```bash
# Ejecutar migraciones pendientes
docker exec library-api-dev npm run db:migrate

# Generar nueva migración desde cambios en schema
docker exec library-api-dev npm run db:generate

# Ver estado de migraciones
docker exec library-api-dev npx drizzle-kit check
```

#### Carga de Datos

```bash
# Consolidar archivos JSON de libros
docker exec library-api-dev npm run consolidate:books

# Sembrar la base de datos con libros consolidados
docker exec library-api-dev npm run seed:database
```

#### Modelos de Ollama

```bash
# Descargar modelo de embeddings
docker exec library-ollama ollama pull nomic-embed-text

# Descargar modelo de traducción
docker exec library-ollama ollama pull qwen2.5:3b

# Listar modelos descargados
docker exec library-ollama ollama list

# Verificar estado de Ollama
curl http://localhost:11434/api/tags
```

### Testing

El proyecto utiliza [Vitest](https://vitest.dev/) como framework de testing con tres niveles:

| Nivel | Descripción | Comando |
|-------|-------------|---------|
| **Unit** | Tests de dominio y aplicación en aislamiento | `npm test` |
| **Integration** | Tests de adaptadores con PostgreSQL/Ollama reales | `npm run test:integration` |
| **E2E** | Tests del sistema completo vía HTTP | `npm run test:e2e` |

#### Estructura de tests

```
apps/api-cli/tests/
├── unit/                    # Tests unitarios (~345 tests)
│   ├── domain/              # Entidades, Value Objects, Criteria
│   ├── application/         # Casos de uso
│   ├── infrastructure/      # Mappers, configuración
│   └── scripts/             # Scripts de consolidación/seeding
├── integration/             # Tests de integración (~63 tests)
│   ├── application/         # Use cases con repos reales
│   ├── infrastructure/      # Repositorios, servicios externos
│   └── scripts/             # Scripts con BD real
└── e2e/                     # Tests end-to-end (~30 tests)
    └── http/                # API REST completa
```

Ver sección [Comandos de desarrollo](#comandos-de-desarrollo) para todos los comandos de testing.

### Desarrollo sin Docker

Si preferís desarrollar sin Docker:

```bash
cd apps/api-cli

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración local de PostgreSQL y Ollama

# Iniciar en modo desarrollo
npm run dev
```

## Producción

### Desplegar en producción

```bash
# Crear archivo de secretos
echo "POSTGRES_PASSWORD=tu_password_seguro" > .env

# Iniciar en modo producción
docker-compose -f docker-compose.prod.yml up -d

# Descargar modelos de Ollama
docker exec library-ollama ollama pull nomic-embed-text
docker exec library-ollama ollama pull qwen2.5:3b

# Ejecutar migraciones
docker exec library-api npm run db:migrate
```

### Consideraciones de producción

- 🔒 Cambiar las contraseñas por defecto
- 🔒 No exponer puertos de PostgreSQL y Ollama externamente
- 📊 Configurar monitoreo y alertas
- 💾 Configurar backups de PostgreSQL
- 🔄 Usar un reverse proxy (nginx, traefik) con HTTPS

## Arquitectura

El proyecto sigue los principios de **Arquitectura Hexagonal (Ports & Adapters)**:

- **Domain**: Entidades y reglas de negocio (sin dependencias externas)
- **Application**: Casos de uso que orquestan el dominio
- **Infrastructure**: Adaptadores para BD, HTTP, CLI, embeddings

Para más detalles, ver [Design Docs](./docs/design_docs/).

## Licencia

MIT
