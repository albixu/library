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
- 🔐 **Autenticación JWT**: Login/logout/refresh con cookies httpOnly, recuperación de contraseña por email
- ⭐ **Favoritos**: Marca libros como favoritos y filtra tu lista personal
- 🌐 **API REST**: Integra con cualquier cliente web
- 📖 **Swagger UI**: Interfaz interactiva de la API disponible en `/docs` (entornos de desarrollo y test)
- 📦 **Carga de datos automática**: Importa libros desde archivos JSON
- 🐳 **Dockerizado**: Todo el sistema corre en contenedores
- 💰 **Costo $0**: Usa tecnologías 100% gratuitas y open source

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Lenguaje | TypeScript + Node.js 20 |
| Base de datos | PostgreSQL 16 + pgvector |
| Embeddings | Ollama + nomic-embed-text |
| Traducciones | LibreTranslate (self-hosted) |
| API | Fastify |
| ORM | Drizzle ORM |
| Frontend | Angular 21.2 + Tailwind CSS |
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
docker compose up -d

# Verificar que todo está corriendo
docker compose ps
```

### 4. Descargar los modelos de IA

```bash
# Usar el script automático (recomendado)
./scripts/setup-ollama-models.sh

# O descargar manualmente:
docker exec library-ollama-embeddings ollama pull nomic-embed-text    # Embeddings
docker exec library-ollama-translations ollama pull llama3.2:1b       # Traducciones
```

> Para otros entornos, ajustar los nombres de contenedor y puertos según la [tabla de entornos](#docker-compose-environments).

### 5. Ejecutar migraciones de base de datos

```bash
docker exec -it library-api-dev bash -c "npm run db:migrate"
```

> Para producción usar `docker exec library-api npm run db:migrate`. Ver [referencia de comandos de BD](#base-de-datos-drizzle).

¡Listo! La API está disponible en `http://localhost:3000` y la documentación interactiva en `http://localhost:3000/docs`

## Carga de Datos Inicial

El proceso de carga de datos se divide en dos fases independientes, cada una con su propio entorno Docker optimizado:

```
original_data/*.json
        │
        ▼ (Fase 1: Consolidación)
initial_data/books_XXXX.json
        │
        ▼ (Fase 2: Seeding)
    Base de datos PostgreSQL
```

### Fase 1: Consolidar archivos JSON

Consolida múltiples archivos JSON de `original_data/` en ficheros particionados, traduciendo las descripciones al español mediante **LibreTranslate** (self-hosted, sin coste ni límite de uso).

**Requisitos:**

- Archivos JSON en `original_data/` (raíz del proyecto)
- LibreTranslate en ejecución (incluido en `docker-compose.consolidate.yml`)

```bash
# 1. Iniciar entorno de consolidación (incluye LibreTranslate)
docker compose -f docker-compose.consolidate.yml up -d

# 2. Verificar que los servicios están corriendo
docker compose -f docker-compose.consolidate.yml ps

# 3. Ejecutar script de consolidación
docker exec library-consolidate-api npm run consolidate:books

# 4. Detener servicios cuando termine
docker compose -f docker-compose.consolidate.yml down
```

> **⚠️ Aviso de memoria (OOM):** Con catálogos grandes (~55.000 libros), el proceso puede ser
> terminado por el sistema operativo por falta de memoria. Si ocurre, establece la variable de
> entorno `NODE_OPTIONS=--max-old-space-size=4096` o usa el script `consolidate:books` que ya
> la incluye por defecto.

**Resultado:** Ficheros `initial_data/books_0001.json`, `books_0002.json`, etc. (máximo 1000 libros por fichero)

**Variables de entorno opcionales:**

- `BOOKS_PER_FILE=1000` - Libros por fichero de salida
- `TRANSLATION_TIMEOUT_MS=60000` - Timeout para traducciones (1 min)
- `LIBRETRANSLATE_URL=http://libretranslate:5000` - URL de LibreTranslate
- `LIBRETRANSLATE_API_KEY=` - API key de LibreTranslate (vacío para instancias locales sin auth)

### Fase 2: Sembrar la base de datos

Carga los ficheros particionados en PostgreSQL, generando embeddings para búsqueda semántica.

**Requisitos:**

- Ficheros en `initial_data/` (generados en Fase 1)
- Ollama con modelo de embeddings `nomic-embed-text`
- PostgreSQL con esquema migrado

```bash
# 1. Iniciar entorno de seeding
docker compose -f docker-compose.seed.yml up -d

# 2. Verificar que los servicios están healthy
docker compose -f docker-compose.seed.yml ps

# 3. Descargar modelo de embeddings (solo la primera vez)
docker exec library-seed-ollama-embeddings ollama pull nomic-embed-text

# 4. Ejecutar migraciones de base de datos (si es necesario)
docker exec library-seed-api npm run db:migrate

# 5. Ejecutar script de seeding
docker exec library-seed-api npm run seed:database

# 6. Detener servicios cuando termine
docker compose -f docker-compose.seed.yml down
```

**Resultado:** Libros cargados en PostgreSQL con embeddings vectoriales

**Variables de entorno opcionales:**

- `BATCH_SIZE=50` - Libros a procesar por lote
- `MAX_RETRIES=3` - Reintentos en caso de error de embedding

### Verificar carga de datos

```bash
# Verificar número de libros en base de datos
docker exec library-postgres psql -U library -d library -c "SELECT COUNT(*) FROM books;"

# O usando la API (si está corriendo)
curl http://localhost:3000/api/books?limit=1 | jq '.meta.total'
```

### Carga automática al iniciar

Para entornos de desarrollo o staging, puedes habilitar la carga automática:

```bash
# En docker-compose.yml o en variables de entorno (.env)
AUTO_SEED=true

# Solo cargará datos si la base de datos está vacía (idempotente)
```

## Uso

### API REST

#### Swagger UI (Documentación Interactiva)

En entornos de desarrollo y test, la API expone una interfaz gráfica interactiva generada a partir del spec OpenAPI:

```
http://localhost:3000/docs
```

Desde ahí podés explorar todos los endpoints, ver los esquemas de request/response y ejecutar llamadas directamente desde el navegador. En producción, la ruta `/docs` no está disponible.

> El spec OpenAPI completo se encuentra en [`docs/api/openapi.yaml`](./docs/api/openapi.yaml).

#### Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Iniciar sesión (JWT en cookies httpOnly) |
| `POST` | `/api/auth/logout` | Cerrar sesión (elimina cookies) |
| `POST` | `/api/auth/refresh` | Renovar tokens de autenticación |
| `POST` | `/api/auth/forgot-password` | Solicitar restablecimiento de contraseña |
| `POST` | `/api/auth/reset-password` | Restablecer contraseña con token |
| `POST` | `/api/books` | Crear un nuevo libro |
| `GET` | `/api/books` | Buscar libros (filtros, paginación, búsqueda semántica) |
| `POST` | `/api/books/:id/send` | Enviar archivo de libro por email |
| `POST` | `/api/books/:id/favorite` | Alternar favorito (requiere auth) |
| `GET` | `/api/book-types` | Listar tipos de libro |
| `GET` | `/api/book-categories` | Listar categorías (filtrable por tipo) |
| `GET` | `/api/book-levels` | Listar niveles de dificultad (filtrable por tipo) |

#### Crear un libro

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "isbn": "9780132350884",
    "title": "Clean Code",
    "authors": ["Robert C. Martin"],
    "description": "A handbook of agile software craftsmanship",
    "type": "technical",
    "categories": ["programming"],
    "format": "pdf",
    "level": "Intermediate",
    "language": "en"
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

> **Nota**: La búsqueda semántica (`text`) genera embeddings del texto y encuentra libros con similaridad ≥55% (umbral calibrado para `nomic-embed-text`). Los resultados incluyen `similarityScore`.

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
│   └── web-client/       # Frontend: Angular 21.2 + Tailwind CSS
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
│   ├── api/                  # OpenAPI spec
│   ├── design_docs/          # Documentación de diseño
│   └── user_stories/         # Historias de usuario
└── entregables_proyecto/     # Documentación auxiliar (documentación a entregar por si los enlaces no funcionan)
```

### Comandos de desarrollo

#### Docker

```bash
# Iniciar todos los contenedores
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f api

# Ver logs de todos los servicios
docker compose logs -f

# Reiniciar solo la API
docker compose restart api

# Detener todo
docker compose down

# Detener y eliminar volúmenes (⚠️ borra datos de BD)
docker compose down -v

# Reconstruir imagen de la API
docker compose build api
```

#### Tests (API)

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

#### Tests (Web Client)

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

#### Lint y TypeScript

```bash
# API
docker exec library-api-dev npm run lint
docker exec library-api-dev npm run lint:fix
docker exec library-api-dev npm run typecheck

# Web Client
cd apps/web-client
npm run lint
npm run lint:fix
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

#### Backup de la Base de Datos

```bash
# Backup en formato custom (recomendado — binario, sin riesgo de encoding)
docker exec library-postgres pg_dump -U library -d library -F c -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump
docker cp library-postgres:/tmp/backup_<timestamp>.dump ./backup_<timestamp>.dump
```

> 💡 El contenedor `library-postgres` es el mismo en desarrollo y producción. Ver sección [Backup y Restore](#backup-y-restore) para más detalles.

#### Carga de Datos

```bash
# Consolidar archivos JSON de libros
docker exec library-api-dev npm run consolidate:books

# Sembrar la base de datos con libros consolidados
docker exec library-api-dev npm run seed:database
```

#### Gestión de Usuarios

```bash
# Crear un usuario (genera contraseña segura y la envía por email)
cd apps/api
npm run create-user -- --email usuario@example.com
```

> Requiere las variables de entorno `GMAIL_USER` y `GMAIL_APP_PASSWORD` configuradas. Si el email ya existe, devuelve un error descriptivo.

#### Modelos de Ollama

```bash
# Descargar modelos (script automático - recomendado)
./scripts/setup-ollama-models.sh

# O manualmente:
docker exec library-ollama-embeddings ollama pull nomic-embed-text
docker exec library-ollama-translations ollama pull llama3.2:1b

# Listar modelos descargados
docker exec library-ollama-embeddings ollama list

# Verificar estado
curl http://localhost:11434/api/tags
```

#### Web Client (Angular)

```bash
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

- **Web Client:** <http://localhost:4200>
- **API (backend):** <http://localhost:3000>
- **Swagger UI:** <http://localhost:3000/docs> *(solo en desarrollo/test)*

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
├── unit/                    # Tests unitarios (~1642 tests)
│   ├── domain/              # Entidades, Value Objects, Criteria
│   ├── application/         # Casos de uso
│   ├── infrastructure/      # Mappers, configuración
│   └── scripts/             # Scripts de consolidación/seeding
├── integration/             # Tests de integración (~184 tests, 44 skipped — Ollama)
│   ├── application/         # Use cases con repos reales
│   ├── infrastructure/      # Repositorios, servicios externos
│   └── scripts/             # Scripts con BD real
└── e2e/                     # Tests end-to-end (~130 tests)
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

El proyecto incluye cinco configuraciones de Docker Compose:

| Archivo | Propósito | Uso |
|---------|-----------|-----|
| `docker-compose.yml` | Desarrollo | Hot reload, debug, desarrollo local |
| `docker-compose.prod.yml` | Producción | Optimizado, seguro, listo para VPS |
| `docker-compose.test.yml` | Testing | E2E tests, CI/CD, aislado |
| `docker-compose.consolidate.yml` | Consolidación | Generar ficheros JSON particionados |
| `docker-compose.seed.yml` | Seeding | Cargar datos en base de datos |

### Puertos por entorno

| Servicio | Desarrollo | Producción | Testing |
|----------|------------|------------|---------|
| Web Client | 4200 | 80 | 4200 |
| API | 3000 | 3000 | 3001 |
| PostgreSQL | 5432 | (interno) | 5433 |
| Ollama Embeddings | 11434 | (interno) | 11435 |
| Ollama Translations | 11435 | (interno) | 11436 |

> **Nota:** Los entornos de consolidación y seeding no exponen puertos externos. Son tareas de un solo uso que reutilizan los volúmenes de datos existentes.

### Comandos comunes por entorno

Todos los entornos Docker siguen el mismo patrón de comandos. Sustituir `<compose-file>` por el archivo correspondiente:

```bash
# Iniciar servicios
docker compose -f <compose-file> up -d

# Ver estado
docker compose -f <compose-file> ps

# Ver logs
docker compose -f <compose-file> logs -f [servicio]

# Reiniciar
docker compose -f <compose-file> restart

# Detener
docker compose -f <compose-file> down

# Detener y eliminar volúmenes (⚠️ borra datos)
docker compose -f <compose-file> down -v

# Reconstruir
docker compose -f <compose-file> up -d --build
```

## Producción

### Desplegar en producción

```bash
# 1. Clonar y configurar
git clone <repository-url>
cd library
cp .env.example .env
# Editar .env y configurar POSTGRES_PASSWORD con una contraseña segura

# 2. Construir e iniciar servicios
docker compose -f docker-compose.prod.yml up -d --build

# 3. Descargar modelos de IA (primera vez)
./scripts/setup-ollama-models.sh

# 4. Ejecutar migraciones de base de datos
docker exec library-api npm run db:migrate

# 5. (Opcional) Cargar datos iniciales
docker exec library-api npm run seed:prod
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
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

#### Fase 2: Datos iniciales (Manual o Automático)

Los datos de libros se cargan desde `initial_data/*` usando el script `seed:prod`:

```bash
# Ejecución manual (recomendado para producción)
docker exec library-api npm run seed:prod
```

El script es **idempotente**: verifica cada libro por ISBN antes de insertarlo. Si el libro ya existe, lo salta. Esto permite ejecutarlo múltiples veces sin duplicar datos.

> Para carga automática, ver [Carga automática al iniciar](#carga-automática-al-iniciar).

### Variables de entorno de producción

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `POSTGRES_PASSWORD` | ✅ | Contraseña de PostgreSQL | `secure_password_123` |
| `API_URL` | ❌ | URL del API para el web client | `http://192.168.1.100:3000` |

### Consideraciones de producción

- 🔒 Cambiar `POSTGRES_PASSWORD` por una contraseña segura
- 🔒 Los puertos de PostgreSQL y Ollama NO se exponen externamente
- 📊 Configurar monitoreo y alertas
- 💾 Configurar backups de PostgreSQL (ver sección [Backup/Restore](#backup-y-restore))
- 🔄 Usar un reverse proxy (nginx, traefik) con HTTPS

### Actualizar un despliegue existente en producción

Usa este proceso para aplicar cambios de código a una VPS ya en funcionamiento **sin perder los datos existentes**.

> ⚠️ **Nunca elimines el contenedor de postgres ni su volumen** durante una actualización. Ahí viven todos los datos.

#### Paso 1 — Hacer backup previo (recomendado)

Antes de cualquier actualización que incluya cambios de schema, hacer un backup:

```bash
docker exec library-postgres pg_dump -U library -d library -F c -f /tmp/backup_preupdate_$(date +%Y%m%d_%H%M%S).dump
docker cp library-postgres:/tmp/backup_preupdate_<timestamp>.dump ~/backup_preupdate_<timestamp>.dump
```

Ver sección [Backup y Restore](#backup-y-restore) para más detalles.

#### Paso 2 — Obtener el código actualizado

```bash
cd library
git pull origin main
```

#### Paso 3 — Reconstruir y reiniciar servicios (sin tocar la base de datos)

```bash
# Reconstruir solo la API y el web client. El flag --no-deps evita reiniciar postgres.
docker compose -f docker-compose.prod.yml up -d --build --no-deps api web-client
```

> Si hubo cambios en `package.json`, el `--build` asegura que la nueva imagen se construye con las dependencias actualizadas.

#### Paso 4 — Aplicar migraciones de base de datos pendientes

Drizzle usa migraciones aditivas: nunca eliminan datos a menos que la migración lo haga explícitamente.

```bash
docker exec library-api npm run db:migrate
```

Si no hay migraciones pendientes, el comando termina sin hacer cambios.

#### Paso 5 — Verificar el estado

```bash
# Confirmar que todos los contenedores están corriendo
docker compose -f docker-compose.prod.yml ps

# Verificar que la API responde correctamente
curl http://localhost:3000/health

# Revisar logs por si hay errores de arranque
docker compose -f docker-compose.prod.yml logs -f api
```

#### Secuencia completa (referencia rápida)

```bash
cd library
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build --no-deps api web-client
docker exec library-api npm run db:migrate
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/health
```

#### Rollback si algo sale mal

```bash
# Volver al commit anterior
cd library
git checkout HEAD~1

# Reconstruir con el código anterior
docker compose -f docker-compose.prod.yml up -d --build --no-deps api web-client
```

> ⚠️ Las migraciones de base de datos ya aplicadas no se revierten automáticamente. Si la migración era destructiva, restaurar desde el backup previo (ver [Backup y Restore](#backup-y-restore)).

## Entorno de Testing

El entorno de testing está completamente aislado de producción con su propia base de datos y volúmenes.

```bash
# Levantar entorno de testing
docker compose -f docker-compose.test.yml up -d

# Descargar modelos de Ollama en testing (primera vez)
OLLAMA_HOST=http://localhost:11435 ./scripts/setup-ollama-models.sh

# Ejecutar tests E2E contra el entorno
docker exec library-api-test npm run test:e2e

# Ver logs
docker compose -f docker-compose.test.yml logs -f

# Destruir entorno (incluyendo volúmenes)
docker compose -f docker-compose.test.yml down -v
```

## Backup y Restore

### Backup de la base de datos

Usar siempre el **formato custom** (`-F c`). Es binario — evita cualquier problema de encoding al copiar el archivo entre sistemas (Windows/Linux).

```bash
# 1. Generar el dump dentro del contenedor
docker exec library-postgres pg_dump -U library -d library -F c -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump

# 2. Copiar el archivo fuera del contenedor
docker cp library-postgres:/tmp/backup_<timestamp>.dump ./backup_<timestamp>.dump
```

> ⚠️ **No usar** `pg_dump ... > archivo.sql` ni pipes (`|`) desde PowerShell/Windows: PowerShell convierte el stream a UTF-16 y corrompe los caracteres especiales (acentos, ñ, etc.).

### Restore de la base de datos

El restore se hace **en dos pasos**: primero copiar el archivo al contenedor, luego ejecutar `pg_restore` desde dentro. Nunca pasar el archivo por PowerShell.

```bash
# 1. Copiar el backup al contenedor (transferencia binaria, sin conversión)
docker cp ./backup_<timestamp>.dump library-postgres:/tmp/backup.dump

# 2. Truncar los datos existentes (respeta el schema y las FK)
docker exec library-postgres psql -U library -d library -c \
  "TRUNCATE TABLE public.user_book_downloads, public.user_book_favorites, public.books CASCADE;"

# 3. Restaurar solo los datos (el schema ya existe y está actualizado)
docker exec library-postgres pg_restore \
  -U library -d library \
  --data-only --disable-triggers \
  -F c /tmp/backup.dump
```

> ℹ️ Los warnings de tipo `duplicate key` en tablas de lookup (`authors`, `categories`, `levels`, `types`) son esperados y se pueden ignorar — esas tablas ya tienen los datos correctos. Los datos de `books` y sus relaciones se restauran sin problema.

> ⚠️ **No usar** `--clean --if-exists` en el restore: falla por dependencias en cascada entre `books`, `user_book_downloads` y `user_book_favorites`.

### Restaurar backup de producción en local (desde VPS con Docker)

```bash
# En el VPS (Linux) — generar y extraer el dump
docker exec <contenedor-postgres-prod> pg_dump -U library -d library -F c -f /tmp/backup_prod.dump
docker cp <contenedor-postgres-prod>:/tmp/backup_prod.dump ~/backup_prod.dump

# Copiar al equipo local
scp usuario@vps:~/backup_prod.dump C:\Users\ion\Desktop\backup_prod.dump

# En local — copiar al contenedor y restaurar (seguir pasos del apartado anterior)
docker cp C:\Users\ion\Desktop\backup_prod.dump library-postgres:/tmp/backup.dump
```

## Troubleshooting

### Problemas comunes

#### Los modelos de Ollama no se descargan

```bash
# Verificar que Ollama está corriendo
docker compose logs ollama-embeddings

# Verificar conectividad
curl http://localhost:11434/api/tags

# Descargar modelo manualmente
docker exec library-ollama-embeddings ollama pull nomic-embed-text
```

#### LibreTranslate no está disponible (consolidación)

```bash
# Verificar que el servicio está corriendo
docker compose -f docker-compose.consolidate.yml ps libretranslate
docker compose -f docker-compose.consolidate.yml logs libretranslate

# Verificar conectividad
curl http://localhost:5000/languages
```

#### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo y saludable
docker compose ps postgres
docker compose logs postgres

# Verificar conectividad
docker exec library-postgres pg_isready -U library -d library
```

#### El API no arranca

```bash
# Verificar logs del API
docker compose logs api

# Verificar que las migraciones se ejecutaron
docker exec library-api-dev npm run db:migrate

# Verificar variables de entorno
docker exec library-api-dev env | grep -E "(DATABASE|OLLAMA|NODE)"
```

#### El Web Client no puede conectar con el API

```bash
# Verificar que el API responde
curl http://localhost:3000/health

# Verificar CORS headers
curl -I http://localhost:3000/api/books

# Verificar la URL del API en la build del web client
# Si cambió, hay que reconstruir la imagen:
docker compose build web-client
docker compose up -d web-client
```

#### Problemas de permisos en volúmenes (Linux)

```bash
# Si hay problemas de permisos con volúmenes
sudo chown -R $(id -u):$(id -g) ./

# O reiniciar con volúmenes limpios
docker compose down -v
docker compose up -d
```

#### Memoria insuficiente para Ollama

Los modelos de IA requieren memoria significativa:

- `nomic-embed-text`: ~500MB
- `llama3.2:1b`: ~1GB

```bash
# Verificar memoria disponible en el contenedor
docker stats library-ollama

# Aumentar límites si es necesario (editar docker-compose.prod.yml)
# deploy:
#   resources:
#     limits:
#       memory: 6G  # Aumentar si es necesario
```

## Verificación de salud

```bash
# Health check del API
curl http://localhost:3000/health

# Health check del Web Client (producción)
curl http://localhost/health

# Verificar que Ollama tiene los modelos
curl http://localhost:11434/api/tags
```

## Arquitectura

El proyecto sigue los principios de **Arquitectura Hexagonal (Ports & Adapters)**:

- **Domain**: Entidades y reglas de negocio (sin dependencias externas)
- **Application**: Casos de uso que orquestan el dominio
- **Infrastructure**: Adaptadores para BD, HTTP, CLI, embeddings

Para más detalles, ver [Design Docs](./docs/design_docs/).

## Licencia

MIT
