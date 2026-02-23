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
| Traducciones | Ollama + qwen2.5:1.5b |
| API | Fastify |
| ORM | Drizzle ORM |
| Frontend | Angular 21 + Angular Material |
| Testing API | Vitest |
| Testing Web | Vitest + Playwright |
| Documentación UI | Storybook |

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
cp apps/api/.env.example apps/api/.env

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
# Usar el script automático (recomendado)
./scripts/setup-ollama-models.sh

# O descargar manualmente:
# Modelo para embeddings (búsqueda semántica)
docker exec library-ollama ollama pull nomic-embed-text

# Modelo para traducciones (descripción de libros)
docker exec library-ollama ollama pull qwen2.5:1.5b
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
│   ├── api/              # Backend: API REST + Scripts
│   │   ├── src/
│   │   │   ├── domain/           # Lógica de negocio pura
│   │   │   ├── application/      # Casos de uso
│   │   │   ├── infrastructure/   # Adaptadores (DB, HTTP)
│   │   │   └── shared/           # Utilidades compartidas
│   │   ├── scripts/              # Consolidación y seeding
│   │   ├── tests/
│   │   └── docker/
│   │
│   └── web-client/       # Frontend: Angular 21 + Material
│       └── docker/
│
├── scripts/
│   └── setup-ollama-models.sh    # Setup de modelos de IA
│
├── docker-compose.yml        # Desarrollo
├── docker-compose.prod.yml   # Producción
├── docker-compose.test.yml   # Testing (aislado)
├── .env.example              # Variables de entorno
│
└── docs/
    ├── api/                  # OpenAPI spec
    ├── design_docs/          # Documentación de diseño
    └── user_stories/         # Historias de usuario
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
docker exec library-ollama ollama pull qwen2.5:1.5b

# Listar modelos descargados
docker exec library-ollama ollama list

# Verificar estado de Ollama
curl http://localhost:11434/api/tags
```

#### Web Client (Angular)

```bash
# Ir al directorio del cliente web
cd apps/web-client

# Instalar dependencias (primera vez)
npm install

# Iniciar servidor de desarrollo
npm start
# La aplicación estará disponible en http://localhost:4200

# Iniciar con puerto específico
npm start -- --port 4300
```

**Acceso desde el navegador:**
- **Desarrollo:** http://localhost:4200
- **API (backend):** http://localhost:3000

#### Tests del Web Client

```bash
cd apps/web-client

# Tests unitarios
npm test

# Tests en modo watch (re-ejecuta al detectar cambios)
npm run test:watch

# Tests con reporte de cobertura
npm run test:coverage

# Tests end-to-end con Playwright
npm run test:e2e

# Tests E2E en modo interactivo (con UI de Playwright)
npm run test:e2e:ui

# Tests E2E con navegador visible
npm run test:e2e:headed
```

#### Storybook

Storybook permite desarrollar y documentar componentes de forma aislada.

```bash
cd apps/web-client

# Iniciar Storybook en modo desarrollo
npm run storybook
# Storybook estará disponible en http://localhost:6006

# Compilar Storybook para producción
npm run build-storybook
```

**Acceso desde el navegador:**
- **Storybook:** http://localhost:6006

#### Lint del Web Client

```bash
cd apps/web-client

# Ejecutar linter
npm run lint

# Ejecutar linter con auto-fix
npm run lint:fix
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
apps/api/tests/
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
cd apps/api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración local de PostgreSQL y Ollama

# Iniciar en modo desarrollo
npm run dev
```

## Docker Compose Environments

El proyecto incluye tres configuraciones de Docker Compose:

| Archivo | Propósito | Uso |
|---------|-----------|-----|
| `docker-compose.yml` | Desarrollo | Hot reload, debug, desarrollo local |
| `docker-compose.prod.yml` | Producción | Optimizado, seguro, listo para VPS |
| `docker-compose.test.yml` | Testing | E2E tests, CI/CD, aislado |

### Puertos por entorno

| Servicio | Desarrollo | Producción | Testing |
|----------|------------|------------|---------|
| Web Client | 4200 | 80 | 4200 |
| API | 3000 | 3000 | 3001 |
| PostgreSQL | 5432 | (interno) | 5433 |
| Ollama | 11434 | (interno) | 11435 |

## Producción

### Desplegar en producción

```bash
# 1. Clonar y configurar
git clone <repository-url>
cd library

# 2. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env y configurar POSTGRES_PASSWORD con una contraseña segura

# 3. Construir e iniciar servicios
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Descargar modelos de IA (primera vez)
./scripts/setup-ollama-models.sh

# 5. Ejecutar migraciones de base de datos
docker exec library-api npm run db:migrate

# 6. (Opcional) Cargar datos iniciales
docker exec library-api npm run seed:database
```

### Inicialización de la base de datos

La inicialización de la base de datos en producción ocurre en dos fases:

#### Fase 1: Schema (Automático)

El archivo `docs/db/init-db.sql` está montado en `/docker-entrypoint-initdb.d/` del contenedor PostgreSQL. Esto significa que:

- PostgreSQL ejecuta automáticamente este script **la primera vez** que se crea el volumen
- Si el volumen ya existe (con datos), el script **NO se ejecuta**
- Este comportamiento es nativo de PostgreSQL Docker

```bash
# Para forzar la reinicialización del schema (⚠️ BORRA TODOS LOS DATOS):
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

#### Fase 2: Datos iniciales (Manual o Automático)

Los datos de libros se cargan desde `docs/db/books.json` usando el script `seed:database`:

```bash
# Ejecución manual (recomendado para producción)
docker exec library-api npm run seed:database
```

El script es **idempotente**: verifica cada libro por ISBN antes de insertarlo. Si el libro ya existe, lo salta. Esto permite ejecutarlo múltiples veces sin duplicar datos.

**Carga automática (opcional):**

Para ambientes de staging o desarrollo, puedes habilitar la carga automática al iniciar el contenedor añadiendo esta variable de entorno:

```bash
# En .env o docker-compose
AUTO_SEED=true
```

Con `AUTO_SEED=true`, el seeding se ejecuta automáticamente al arrancar la API. Como es idempotente, si los libros ya existen no se duplican.

#### Verificar estado de la base de datos

```bash
# Verificar que hay libros cargados
curl http://localhost:3000/api/books?limit=1

# Contar libros en la base de datos
docker exec library-postgres psql -U library -d library -c "SELECT COUNT(*) FROM books;"
```

### Comandos de producción

```bash
# Ver estado de los servicios
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f api

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Detener servicios
docker-compose -f docker-compose.prod.yml down

# Reconstruir después de cambios
docker-compose -f docker-compose.prod.yml up -d --build
```

### Verificar salud de servicios

```bash
# Health check del API
curl http://localhost:3000/health

# Health check del Web Client
curl http://localhost/health

# Verificar que Ollama tiene los modelos
curl http://localhost:11434/api/tags
```

### Variables de entorno de producción

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `POSTGRES_PASSWORD` | ✅ | Contraseña de PostgreSQL | `secure_password_123` |
| `API_URL` | ❌ | URL del API para el web client | `http://192.168.1.100:3000` |

### Consideraciones de producción

- 🔒 Cambiar `POSTGRES_PASSWORD` por una contraseña segura
- 🔒 Los puertos de PostgreSQL y Ollama NO se exponen externamente
- 📊 Configurar monitoreo y alertas
- 💾 Configurar backups de PostgreSQL (ver sección Backup/Restore)
- 🔄 Usar un reverse proxy (nginx, traefik) con HTTPS

## Entorno de Testing

El entorno de testing está completamente aislado de producción con su propia base de datos y volúmenes.

### Comandos de testing

```bash
# Levantar entorno de testing
docker-compose -f docker-compose.test.yml up -d

# Descargar modelos de Ollama en testing (primera vez)
OLLAMA_HOST=http://localhost:11435 ./scripts/setup-ollama-models.sh

# Ejecutar tests E2E contra el entorno
docker exec library-api-test npm run test:e2e

# Ver logs
docker-compose -f docker-compose.test.yml logs -f

# Destruir entorno (incluyendo volúmenes)
docker-compose -f docker-compose.test.yml down -v
```

## Backup y Restore

### Backup de la base de datos

```bash
# Producción
docker exec library-postgres pg_dump -U library library > backup_$(date +%Y%m%d_%H%M%S).sql

# Con compresión
docker exec library-postgres pg_dump -U library library | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore de la base de datos

```bash
# Desde archivo SQL
docker exec -i library-postgres psql -U library library < backup.sql

# Desde archivo comprimido
gunzip -c backup.sql.gz | docker exec -i library-postgres psql -U library library
```

## Troubleshooting

### Problemas comunes

#### Los modelos de Ollama no se descargan

```bash
# Verificar que Ollama está corriendo
docker-compose -f docker-compose.prod.yml logs ollama

# Verificar conectividad
curl http://localhost:11434/api/tags

# Descargar modelos manualmente
docker exec library-ollama ollama pull nomic-embed-text
docker exec library-ollama ollama pull qwen2.5:1.5b
```

#### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo y saludable
docker-compose -f docker-compose.prod.yml ps postgres
docker-compose -f docker-compose.prod.yml logs postgres

# Verificar conectividad
docker exec library-postgres pg_isready -U library -d library
```

#### El API no arranca

```bash
# Verificar logs del API
docker-compose -f docker-compose.prod.yml logs api

# Verificar que las migraciones se ejecutaron
docker exec library-api npm run db:migrate

# Verificar variables de entorno
docker exec library-api env | grep -E "(DATABASE|OLLAMA|NODE)"
```

#### El Web Client no puede conectar con el API

```bash
# Verificar que el API responde
curl http://localhost:3000/health

# Verificar CORS headers
curl -I http://localhost:3000/api/books

# Verificar la URL del API en la build del web client
# Si cambió, hay que reconstruir la imagen:
docker-compose -f docker-compose.prod.yml build web-client
docker-compose -f docker-compose.prod.yml up -d web-client
```

#### Problemas de permisos en volúmenes (Linux)

```bash
# Si hay problemas de permisos con volúmenes
sudo chown -R $(id -u):$(id -g) ./

# O reiniciar con volúmenes limpios
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

#### Memoria insuficiente para Ollama

Los modelos de IA requieren memoria significativa:
- `nomic-embed-text`: ~500MB
- `qwen2.5:1.5b`: ~1GB

```bash
# Verificar memoria disponible en el contenedor
docker stats library-ollama

# Aumentar límites si es necesario (editar docker-compose.prod.yml)
# deploy:
#   resources:
#     limits:
#       memory: 6G  # Aumentar si es necesario
```

## Arquitectura

El proyecto sigue los principios de **Arquitectura Hexagonal (Ports & Adapters)**:

- **Domain**: Entidades y reglas de negocio (sin dependencias externas)
- **Application**: Casos de uso que orquestan el dominio
- **Infrastructure**: Adaptadores para BD, HTTP, CLI, embeddings

Para más detalles, ver [Design Docs](./docs/design_docs/).

## Licencia

MIT
