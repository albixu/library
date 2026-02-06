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
- 🖥️ **CLI**: Gestiona tu biblioteca desde la terminal
- 🌐 **API REST**: Integra con cualquier cliente web
- 🐳 **Dockerizado**: Todo el sistema corre en contenedores
- 💰 **Costo $0**: Usa tecnologías 100% gratuitas y open source

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Lenguaje | TypeScript + Node.js 20 |
| Base de datos | PostgreSQL 16 + pgvector |
| Embeddings | Ollama + nomic-embed-text |
| API | Fastify |
| CLI | Commander.js |
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

### 4. Descargar el modelo de embeddings

```bash
# Esto solo es necesario la primera vez
docker exec library-ollama ollama pull nomic-embed-text
```

### 5. Ejecutar migraciones de base de datos

```bash
# Entrar al contenedor de la API
docker exec -it library-api-dev sh

# Ejecutar migraciones
npm run db:migrate
```

¡Listo! La API está disponible en `http://localhost:3000`

## Uso

### API REST

#### Crear un libro

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "description": "A handbook of agile software craftsmanship",
    "type": "technical",
    "category": "programming",
    "format": "pdf"
  }'
```

#### Buscar libros (búsqueda semántica)

```bash
curl "http://localhost:3000/books/search?q=libros%20sobre%20buenas%20practicas%20de%20programacion"
```

#### Obtener un libro por ID

```bash
curl http://localhost:3000/books/{id}
```

#### Listar todos los libros

```bash
curl http://localhost:3000/books
```

#### Actualizar un libro

```bash
curl -X PUT http://localhost:3000/books/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Nueva descripción actualizada"
  }'
```

#### Eliminar un libro

```bash
curl -X DELETE http://localhost:3000/books/{id}
```

### CLI

```bash
# Entrar al contenedor
docker exec -it library-api-dev sh

# Ver comandos disponibles
npm run cli -- --help

# Añadir un libro
npm run cli -- add

# Buscar libros
npm run cli -- search "novelas de misterio"

# Listar libros
npm run cli -- list

# Obtener un libro
npm run cli -- get <id>

# Actualizar un libro
npm run cli -- update <id>

# Eliminar un libro
npm run cli -- delete <id>
```

## Desarrollo

### Estructura del proyecto

```
library/
├── apps/
│   ├── api-cli/          # Backend: API REST + CLI
│   │   ├── src/
│   │   │   ├── domain/           # Lógica de negocio pura
│   │   │   ├── application/      # Casos de uso
│   │   │   ├── infrastructure/   # Adaptadores (DB, HTTP, CLI)
│   │   │   └── shared/           # Utilidades compartidas
│   │   ├── tests/
│   │   └── docker/
│   │
│   └── web-client/       # Frontend (futuro)
│
├── docker-compose.yml        # Desarrollo
├── docker-compose.prod.yml   # Producción
└── docs/
    └── design_docs/          # Documentación de diseño
```

### Comandos de desarrollo

```bash
# Iniciar en modo desarrollo (con hot reload)
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f api

# Reiniciar solo la API
docker-compose restart api

# Ejecutar tests
docker exec -it library-api-dev npm test

# Ejecutar linter
docker exec -it library-api-dev npm run lint

# Generar nueva migración
docker exec -it library-api-dev npm run db:generate

# Detener todo
docker-compose down

# Detener y eliminar volúmenes (⚠️ borra datos)
docker-compose down -v
```

### Testing

El proyecto utiliza [Vitest](https://vitest.dev/) como framework de testing.

#### Ejecutar tests con Docker

```bash
# Ejecutar todos los tests
docker exec -it library-api-dev npm test

# Tests en modo watch (re-ejecuta al detectar cambios)
docker exec -it library-api-dev npm run test:watch

# Tests con reporte de cobertura
docker exec -it library-api-dev npm run test:coverage

# Tests con interfaz gráfica
docker exec -it library-api-dev npm run test:ui
```

#### Ejecutar tests sin Docker

```bash
cd apps/api-cli

# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm run test:coverage

# Tests con UI (abre en navegador)
npm run test:ui
```

#### Estructura de tests

```
apps/api-cli/tests/
├── unit/                    # Tests unitarios
│   ├── domain/              # Tests de la capa de dominio
│   │   ├── entities/        # Tests de entidades
│   │   └── value-objects/   # Tests de value objects
│   └── application/         # Tests de casos de uso
├── integration/             # Tests de integración
│   └── infrastructure/      # Tests de adaptadores con deps reales
└── e2e/                     # Tests end-to-end
    ├── cli/                 # Tests del CLI
    └── http/                # Tests de la API HTTP
```

#### Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm test` | Ejecuta todos los tests una vez |
| `npm run test:watch` | Ejecuta tests en modo watch |
| `npm run test:coverage` | Genera reporte de cobertura en `coverage/` |
| `npm run test:ui` | Abre interfaz web interactiva de Vitest |

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

# Ejecutar CLI
npm run cli -- --help
```

## Producción

### Desplegar en producción

```bash
# Crear archivo de secretos
echo "POSTGRES_PASSWORD=tu_password_seguro" > .env

# Iniciar en modo producción
docker-compose -f docker-compose.prod.yml up -d

# Descargar modelo de embeddings
docker exec library-ollama ollama pull nomic-embed-text

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
