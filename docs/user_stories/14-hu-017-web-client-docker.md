# HU-017: Dockerizacion del Web Client

## Descripcion

**Como** desarrollador del proyecto Library,  
**Quiero** tener el web-client dockerizado con hot reload y capacidad de ejecutar tests,  
**Para** poder desarrollar sin necesidad de instalar Node.js localmente y mantener consistencia con el entorno del API.

## Contexto

Actualmente el API ya esta dockerizado con un entorno de desarrollo completo que incluye:
- Hot reload con tsx watch
- Ejecucion de tests (unit, integration, e2e)
- Volumes para node_modules
- Usuario no-root por seguridad
- Entrypoint script para permisos

Esta historia replica esa configuracion para el web-client de Angular, permitiendo:
- Desarrollo con `ng serve` y hot reload
- Ejecucion de tests unitarios con Vitest
- Ejecucion de tests e2e con Playwright
- Ejecucion de Storybook
- Linting y building

## Referencia

- **API Docker Setup**: `apps/api/docker/Dockerfile.dev` y `apps/api/docker/entrypoint.dev.sh`
- **Docker Compose actual**: `docker-compose.yml`

---

## Criterios de Aceptacion

### AC-1: Dockerfile de Desarrollo

- [ ] Existe `apps/web-client/docker/Dockerfile.dev`
- [ ] Usa Node 20 Alpine como imagen base
- [ ] Instala dependencias necesarias para Angular y Playwright
- [ ] Crea usuario no-root `nodejs` (UID 1001) por seguridad
- [ ] Instala Angular CLI globalmente
- [ ] Expone puerto 4200 (ng serve) y 6006 (Storybook)
- [ ] Tiene healthcheck configurado

### AC-2: Entrypoint Script

- [ ] Existe `apps/web-client/docker/entrypoint.dev.sh`
- [ ] Corrige permisos de directorios necesarios
- [ ] Ejecuta comandos como usuario `nodejs` (no root)
- [ ] Permite pasar comandos custom al contenedor

### AC-3: Docker Compose

- [ ] El servicio `web-client` esta anadido a `docker-compose.yml`
- [ ] Monta el codigo fuente como volume para hot reload
- [ ] Usa named volume para `node_modules`
- [ ] Configura puertos 4200 y 6006
- [ ] Esta en la misma red que el API (`library-network`)
- [ ] Puede comunicarse con el API (para futuras llamadas HTTP)

### AC-4: Ejecucion de Comandos

- [ ] `docker compose up web-client` levanta el servidor de desarrollo con hot reload
- [ ] `docker exec library-web-client npm test` ejecuta tests unitarios
- [ ] `docker exec library-web-client npm run lint` ejecuta linting
- [ ] `docker exec library-web-client npm run build` compila la aplicacion
- [ ] `docker exec library-web-client npm run storybook` levanta Storybook (puerto 6006)

### AC-5: Tests E2E con Playwright

- [ ] Playwright y sus browsers estan instalados en la imagen
- [ ] `docker exec library-web-client npm run test:e2e` ejecuta tests e2e
- [ ] Los tests e2e pueden correr en modo headless dentro del contenedor

---

## Especificaciones Tecnicas

### Estructura de Archivos

```
apps/web-client/
├── docker/
│   ├── Dockerfile.dev
│   └── entrypoint.dev.sh
├── src/
├── package.json
└── ...
```

### Dockerfile.dev

```dockerfile
# ================================
# DEVELOPMENT DOCKERFILE - Web Client
# Optimized for hot reload with mounted volumes
# Security-hardened for development environment
# ================================

FROM node:20-alpine

LABEL maintainer="Library Team" \
      org.opencontainers.image.title="Library Web Client (Development)" \
      org.opencontainers.image.description="Development image for Library Angular Web Client"

# Install dependencies:
# - chromium, firefox for Playwright
# - su-exec for privilege dropping
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        chromium \
        firefox \
        su-exec \
        # Fonts for proper text rendering in browsers
        font-noto \
        font-noto-cjk && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs -h /home/nodejs -s /sbin/nologin

WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies and Angular CLI globally
RUN npm install && \
    npm install -g @angular/cli && \
    npm cache clean --force

# Install Playwright browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/home/nodejs/.cache/ms-playwright
RUN npx playwright install --with-deps chromium firefox && \
    chown -R nodejs:nodejs /home/nodejs/.cache

# Create necessary directories
RUN mkdir -p /app/src /app/node_modules && \
    chown -R nodejs:nodejs /app

# Copy entrypoint script
COPY --chmod=755 docker/entrypoint.dev.sh /usr/local/bin/entrypoint.sh

# Environment variables
ENV NODE_ENV=development \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    # Angular CLI analytics disabled
    NG_CLI_ANALYTICS=false \
    # Playwright config
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Expose ports: Angular dev server (4200), Storybook (6006)
EXPOSE 4200 6006

# Health check for Angular dev server
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4200/ || exit 1

ENTRYPOINT ["entrypoint.sh"]

# Default command: start Angular dev server with host binding
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]
```

### entrypoint.dev.sh

```bash
#!/bin/sh
# ================================
# Development Entrypoint Script - Web Client
# Runs as root to fix permissions, then drops to nodejs user
# ================================

set -e

# Fix permissions for cache directories
if [ -d "/app/node_modules" ]; then
    mkdir -p /app/node_modules/.angular
    chown -R nodejs:nodejs /app/node_modules/.angular 2>/dev/null || true
fi

# Ensure .angular cache directory exists with proper permissions
mkdir -p /app/.angular/cache
chown -R nodejs:nodejs /app/.angular

# Drop privileges and execute the main command as nodejs user
exec su-exec nodejs "$@"
```

### Docker Compose Service

```yaml
# ----- Web Client Application -----
web-client:
  build:
    context: ./apps/web-client
    dockerfile: docker/Dockerfile.dev
  container_name: library-web-client
  ports:
    - "4200:4200"   # Angular dev server
    - "6006:6006"   # Storybook
  volumes:
    # Mount source code for hot reload
    - ./apps/web-client/src:/app/src
    - ./apps/web-client/public:/app/public
    - ./apps/web-client/e2e:/app/e2e
    - ./apps/web-client/.storybook:/app/.storybook
    - ./apps/web-client/package.json:/app/package.json
    - ./apps/web-client/tsconfig.json:/app/tsconfig.json
    - ./apps/web-client/tsconfig.app.json:/app/tsconfig.app.json
    - ./apps/web-client/tsconfig.spec.json:/app/tsconfig.spec.json
    - ./apps/web-client/angular.json:/app/angular.json
    - ./apps/web-client/eslint.config.js:/app/eslint.config.js
    - ./apps/web-client/playwright.config.ts:/app/playwright.config.ts
    # Named volume for node_modules
    - web_client_node_modules:/app/node_modules
    # Angular cache
    - web_client_angular_cache:/app/.angular
  environment:
    - NODE_ENV=development
    - NG_CLI_ANALYTICS=false
    # API URL for HTTP calls
    - API_URL=http://api:3000
  networks:
    - library-network
  restart: unless-stopped
```

### Volumes a Anadir

```yaml
volumes:
  # ... existing volumes ...
  web_client_node_modules:
    name: library-web-client-node-modules
  web_client_angular_cache:
    name: library-web-client-angular-cache
```

---

## Tareas de Implementacion

### Tarea 1: Crear Dockerfile.dev
**Estimacion**: 1 hora

- [ ] Crear directorio `apps/web-client/docker/`
- [ ] Crear `Dockerfile.dev` con configuracion base Node 20 Alpine
- [ ] Instalar dependencias del sistema (chromium, firefox para Playwright)
- [ ] Configurar usuario no-root `nodejs`
- [ ] Instalar Angular CLI globalmente
- [ ] Configurar Playwright browsers
- [ ] Configurar healthcheck
- [ ] Exponer puertos 4200 y 6006

### Tarea 2: Crear entrypoint.dev.sh
**Estimacion**: 0.5 horas

- [ ] Crear `entrypoint.dev.sh`
- [ ] Implementar correccion de permisos para directorios de cache
- [ ] Implementar drop de privilegios con su-exec
- [ ] Hacer el script ejecutable

### Tarea 3: Actualizar docker-compose.yml
**Estimacion**: 0.5 horas

- [ ] Anadir servicio `web-client` con configuracion completa
- [ ] Configurar volumes para hot reload
- [ ] Anadir named volumes para node_modules y angular cache
- [ ] Configurar red y puertos
- [ ] Configurar variables de entorno

### Tarea 4: Verificar funcionamiento basico
**Estimacion**: 1 hora

- [ ] Ejecutar `docker compose build web-client`
- [ ] Ejecutar `docker compose up web-client`
- [ ] Verificar que Angular dev server arranca correctamente
- [ ] Verificar hot reload modificando un archivo
- [ ] Verificar acceso en http://localhost:4200

### Tarea 5: Verificar ejecucion de tests
**Estimacion**: 0.5 horas

- [ ] Ejecutar `docker exec library-web-client npm test`
- [ ] Verificar que todos los tests unitarios pasan
- [ ] Ejecutar `docker exec library-web-client npm run lint`
- [ ] Verificar que linting funciona correctamente

### Tarea 6: Verificar Playwright y tests E2E
**Estimacion**: 1 hora

- [ ] Verificar que Playwright esta instalado correctamente
- [ ] Ejecutar `docker exec library-web-client npm run test:e2e`
- [ ] Verificar que tests e2e corren en modo headless
- [ ] Ajustar configuracion de Playwright si es necesario

### Tarea 7: Verificar Storybook
**Estimacion**: 0.5 horas

- [ ] Ejecutar Storybook: `docker exec -it library-web-client npm run storybook`
- [ ] Verificar acceso en http://localhost:6006
- [ ] Verificar que las stories existentes se renderizan correctamente

### Tarea 8: Documentar uso
**Estimacion**: 0.5 horas

- [ ] Actualizar README.md del web-client con instrucciones Docker
- [ ] Documentar comandos comunes (test, lint, build, storybook)
- [ ] Documentar troubleshooting comun

---

## Estimacion Total

| Fase | Horas |
|------|-------|
| Dockerfile.dev | 1 |
| entrypoint.dev.sh | 0.5 |
| docker-compose.yml | 0.5 |
| Verificar funcionamiento | 1 |
| Verificar tests | 0.5 |
| Verificar Playwright/E2E | 1 |
| Verificar Storybook | 0.5 |
| Documentacion | 0.5 |
| **Total** | **5.5 horas** |

---

## Dependencias

- HU-014: Configuracion inicial del Web Client (completada) - El proyecto Angular ya existe
- Docker y Docker Compose instalados en la maquina de desarrollo

---

## Notas de Implementacion

### Hot Reload en Windows/Docker

Angular CLI necesita polling para detectar cambios en archivos montados desde Windows:
```bash
ng serve --host 0.0.0.0 --poll 2000
```

El parametro `--poll 2000` hace que Angular verifique cambios cada 2 segundos en lugar de usar file system events (que no funcionan bien con volumes de Docker en Windows).

### Playwright en Alpine

Alpine Linux requiere dependencias adicionales para ejecutar browsers. Usamos:
- `chromium` y `firefox` nativos de Alpine
- `font-noto` para renderizado de texto

La variable `PLAYWRIGHT_BROWSERS_PATH` apunta a un directorio con permisos correctos para el usuario nodejs.

### Puertos

| Puerto | Servicio | Descripcion |
|--------|----------|-------------|
| 4200 | ng serve | Servidor de desarrollo Angular |
| 6006 | Storybook | Documentacion de componentes |

### Comandos Docker Comunes

```bash
# Levantar web-client
docker compose up web-client

# Ver logs
docker compose logs -f web-client

# Ejecutar tests
docker exec library-web-client npm test

# Ejecutar tests con watch (interactivo)
docker exec -it library-web-client npm run test:watch

# Linting
docker exec library-web-client npm run lint
docker exec library-web-client npm run lint:fix

# Build
docker exec library-web-client npm run build

# Storybook (interactivo, mantiene puerto 6006)
docker exec -it library-web-client npm run storybook

# Tests E2E
docker exec library-web-client npm run test:e2e

# Shell dentro del contenedor
docker exec -it library-web-client sh
```

### Troubleshooting

**Error: EACCES permission denied**
- Rebuilder la imagen: `docker compose build --no-cache web-client`
- Borrar volumes: `docker volume rm library-web-client-node-modules library-web-client-angular-cache`

**Hot reload no funciona**
- Verificar que `--poll 2000` esta en el comando
- Reiniciar el contenedor: `docker compose restart web-client`

**Tests e2e fallan con browser errors**
- Verificar que Playwright browsers estan instalados: `docker exec library-web-client npx playwright install`
