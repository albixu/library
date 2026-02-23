# HU-018: Dockerización de Producción

## Información General

| Campo | Valor |
|-------|-------|
| **ID** | HU-018 |
| **Título** | Dockerización de Producción |
| **Épica** | Infraestructura |
| **Prioridad** | Alta |
| **Estimación** | 6 horas |
| **Rama** | `feature/HU-018-production-docker` |

---

## Descripción

**Como** desarrollador del proyecto Library,  
**Quiero** tener un entorno de producción completamente dockerizado con todos los servicios necesarios,  
**Para** poder desplegar la aplicación de forma consistente tanto en mi VPS como en mi máquina local.

## Contexto

Actualmente el proyecto tiene:
- ✅ Docker de desarrollo completo (`docker-compose.yml`) con API, Web Client, PostgreSQL y Ollama
- ✅ Dockerfile de producción para el API (`apps/api/docker/Dockerfile`)
- ✅ Docker de producción parcial (`docker-compose.prod.yml`) sin web-client
- ❌ Dockerfile de producción para el Web Client (falta)
- ❌ Configuración nginx para el Web Client (falta)
- ❌ Entorno de testing dockerizado separado (falta)

### Servicios a Dockerizar

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `web-client` | 80 | Angular app servida por Nginx |
| `api` | 3000 | Fastify API (Node.js) |
| `postgres` | 5432 (interno) | PostgreSQL 16 + pgvector |
| `ollama` | 11434 (interno) | Modelos de IA (embeddings + traducción) |

### Modelos de IA Utilizados

| Modelo | Propósito | Configuración |
|--------|-----------|---------------|
| `nomic-embed-text` | Generación de embeddings para búsqueda semántica | `OLLAMA_MODEL` |
| `qwen2.5:3b` | Traducción de descripciones al español | `TRANSLATION_MODEL` |

---

## Criterios de Aceptación

### AC-1: Dockerfile de Producción para Web Client
- [ ] Multi-stage build (builder + nginx)
- [ ] Build de Angular optimizado para producción
- [ ] Imagen nginx:alpine como base final
- [ ] Usuario no-root para seguridad
- [ ] Labels de metadatos OCI
- [ ] Tamaño de imagen optimizado (< 50MB)

### AC-2: Configuración Nginx
- [ ] SPA routing (`try_files $uri $uri/ /index.html`)
- [ ] Compresión Gzip habilitada para text/html, CSS, JS, JSON
- [ ] Cache headers para assets estáticos (1 año, immutable)
- [ ] Security headers básicos (X-Content-Type-Options, X-Frame-Options)
- [ ] Health check endpoint (`/health` → 200 OK)

### AC-3: Docker Compose de Producción Actualizado
- [ ] Servicio `web-client` con nginx
- [ ] Servicio `api` (ya existente, verificar configuración)
- [ ] Servicio `postgres` con volumen persistente (ya existente)
- [ ] Servicio `ollama` con volumen persistente (ya existente)
- [ ] Red interna `library-network` (ya existente)
- [ ] Variables de entorno via archivo `.env`
- [ ] Health checks para todos los servicios
- [ ] Límites de recursos (memory/CPU) apropiados
- [ ] Política de reinicio `always`

### AC-4: Gestión de Variables de Entorno
- [ ] Archivo `.env.example` actualizado con todas las variables de producción
- [ ] `API_URL` inyectada en build time para el web-client
- [ ] `POSTGRES_PASSWORD` como variable obligatoria externa
- [ ] Documentación de variables requeridas vs opcionales

### AC-5: Docker Compose de Testing
- [ ] Archivo `docker-compose.test.yml` separado
- [ ] Base de datos PostgreSQL independiente (volumen separado)
- [ ] Configuración para ejecutar tests E2E
- [ ] No comparte datos con producción
- [ ] Fácil de levantar y destruir (`docker-compose -f docker-compose.test.yml up/down`)

### AC-6: Script de Inicialización de Modelos Ollama
- [ ] Script que descarga los modelos necesarios (`nomic-embed-text`, `qwen2.5:3b`)
- [ ] Verificación de que los modelos están disponibles antes de iniciar API
- [ ] Documentación del proceso de setup inicial

### AC-7: Optimizaciones de Producción
- [ ] Logs en formato JSON para el API
- [ ] Compresión de respuestas HTTP en API (si no existe)
- [ ] Límites de recursos basados en análisis del proyecto:
  - web-client: 128MB RAM (nginx es muy ligero)
  - api: 512MB RAM
  - postgres: 1GB RAM
  - ollama: 4GB RAM (modelos de IA requieren más memoria)

### AC-8: Documentación
- [ ] README actualizado con instrucciones de despliegue
- [ ] Comandos de producción documentados
- [ ] Troubleshooting de problemas comunes
- [ ] Proceso de backup/restore de base de datos

---

## Diseño Técnico

### Estructura de Archivos

```
/
├── docker-compose.yml           # Desarrollo (existente)
├── docker-compose.prod.yml      # Producción (actualizar)
├── docker-compose.test.yml      # Testing (nuevo)
├── .env.example                 # Variables de ejemplo (actualizar)
├── scripts/
│   └── setup-ollama-models.sh   # Script de setup de modelos (nuevo)
├── apps/
│   ├── api/
│   │   └── docker/
│   │       ├── Dockerfile       # Producción (existente)
│   │       └── Dockerfile.dev   # Desarrollo (existente)
│   └── web-client/
│       └── docker/
│           ├── Dockerfile       # Producción (nuevo)
│           ├── Dockerfile.dev   # Desarrollo (existente)
│           ├── nginx.conf       # Configuración nginx (nuevo)
│           └── entrypoint.dev.sh # Desarrollo (existente)
```

### Dockerfile Web Client (Producción)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG API_URL=http://localhost:3000
ENV API_URL=${API_URL}
RUN npm run build

# Stage 2: Nginx
FROM nginx:alpine
COPY --from=builder /app/dist/web-client/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

### Configuración Nginx

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Health check
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
        
        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Docker Compose Producción (Actualizado)

```yaml
services:
  web-client:
    build:
      context: ./apps/web-client
      dockerfile: docker/Dockerfile
      args:
        API_URL: http://${HOST_IP:-localhost}:3000
    container_name: library-web
    ports:
      - "80:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - library-network
    restart: always
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M

  api:
    # ... (existente, verificar health check)
    
  postgres:
    # ... (existente)
    
  ollama:
    # ... (existente, aumentar memoria a 4GB)
```

### Docker Compose Testing

```yaml
# docker-compose.test.yml
services:
  web-client-test:
    build:
      context: ./apps/web-client
      dockerfile: docker/Dockerfile
      args:
        API_URL: http://api-test:3000
    ports:
      - "4200:80"
    depends_on:
      - api-test
    networks:
      - library-test-network

  api-test:
    build:
      context: ./apps/api
      dockerfile: docker/Dockerfile
    environment:
      - DATABASE_URL=postgresql://library:library@postgres-test:5432/library_test
      - OLLAMA_BASE_URL=http://ollama-test:11434
    depends_on:
      postgres-test:
        condition: service_healthy
    networks:
      - library-test-network

  postgres-test:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_DB=library_test
      - POSTGRES_USER=library
      - POSTGRES_PASSWORD=library
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
      - ./docs/db/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U library -d library_test"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - library-test-network

  ollama-test:
    image: ollama/ollama:latest
    volumes:
      - ollama_test_data:/root/.ollama
    networks:
      - library-test-network

networks:
  library-test-network:
    driver: bridge

volumes:
  postgres_test_data:
    name: library-postgres-test-data
  ollama_test_data:
    name: library-ollama-test-data
```

---

## Tareas Técnicas

### Tarea 1: Dockerfile de Producción para Web Client (1h)
- Crear `apps/web-client/docker/Dockerfile`
- Multi-stage build con Node 20 y Nginx Alpine
- Build argument para `API_URL`
- Usuario no-root y security labels

### Tarea 2: Configuración Nginx (0.5h)
- Crear `apps/web-client/docker/nginx.conf`
- SPA routing, Gzip, Cache headers, Security headers
- Health check endpoint

### Tarea 3: Actualizar Docker Compose Producción (1h)
- Añadir servicio `web-client`
- Verificar y ajustar configuración de servicios existentes
- Añadir health checks faltantes
- Ajustar límites de recursos (especialmente Ollama → 4GB)

### Tarea 4: Docker Compose Testing (1h)
- Crear `docker-compose.test.yml`
- Servicios independientes con sufijo `-test`
- Volúmenes separados
- Network aislada

### Tarea 5: Script de Setup de Modelos Ollama (0.5h)
- Crear `scripts/setup-ollama-models.sh`
- Descargar `nomic-embed-text` y `qwen2.5:3b`
- Verificación de disponibilidad

### Tarea 6: Variables de Entorno y Documentación (1h)
- Actualizar `.env.example` con todas las variables
- Actualizar README con instrucciones de despliegue
- Documentar comandos de producción y testing
- Añadir sección de troubleshooting

### Tarea 7: Verificación y Testing (1h)
- Probar build de producción localmente
- Verificar que todos los servicios arrancan correctamente
- Verificar health checks
- Probar entorno de testing
- Ejecutar E2E tests contra entorno dockerizado

### Tarea 8: Documentación y Comandos Útiles (0.5h)
- Actualizar README.md principal con sección de Docker
- Documentar todos los comandos útiles con descripción
- Crear tabla de referencia rápida de comandos
- Documentar proceso de backup/restore de base de datos
- Añadir sección de troubleshooting con problemas comunes

---

## Variables de Entorno

### Producción (`.env`)

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `POSTGRES_PASSWORD` | ✅ | Contraseña de PostgreSQL | `secure_password_123` |
| `HOST_IP` | ❌ | IP/hostname para API_URL | `192.168.1.100` |
| `NODE_ENV` | ❌ | Entorno (default: production) | `production` |

### Build Args (Web Client)

| Arg | Descripción | Default |
|-----|-------------|---------|
| `API_URL` | URL del backend API | `http://localhost:3000` |

---

## Comandos de Uso

### Producción

```bash
# Primer setup (descargar modelos de IA)
./scripts/setup-ollama-models.sh

# Levantar todos los servicios
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Parar servicios
docker-compose -f docker-compose.prod.yml down

# Rebuild después de cambios
docker-compose -f docker-compose.prod.yml up -d --build
```

### Testing

```bash
# Levantar entorno de testing
docker-compose -f docker-compose.test.yml up -d

# Ejecutar E2E tests
docker exec library-web-client-test npm run test:e2e

# Destruir entorno (incluyendo volúmenes)
docker-compose -f docker-compose.test.yml down -v
```

---

## Notas de Implementación

1. **API_URL en Build Time**: Angular compila la URL del API en el bundle. Para cambiarla, hay que rebuildar la imagen. Esto es aceptable para este proyecto ya que es de uso personal.

2. **Ollama Memory**: Los modelos de IA requieren significativamente más memoria. `qwen2.5:3b` necesita ~3GB solo para cargarse. El límite de 4GB debería ser suficiente.

3. **Volúmenes Separados**: Producción y testing usan volúmenes con nombres diferentes (`-prod` vs `-test`) para evitar contaminación de datos.

4. **Health Checks**: Todos los servicios tienen health checks para que Docker pueda reiniciarlos automáticamente si fallan.

5. **Security Headers**: Se incluyen headers básicos de seguridad. HTTPS se implementará en una historia futura.

---

## Dependencias

- ✅ HU-017: Dockerización del Web Client (desarrollo) - Completada

## Definition of Done

- [ ] Dockerfile de producción para web-client creado y funcionando
- [ ] Nginx configurado con SPA routing y optimizaciones
- [ ] docker-compose.prod.yml actualizado con web-client
- [ ] docker-compose.test.yml creado y funcionando
- [ ] Script de setup de modelos Ollama creado
- [ ] .env.example actualizado
- [ ] README actualizado con instrucciones
- [ ] Todos los servicios arrancan correctamente en producción
- [ ] Health checks funcionando para todos los servicios
- [ ] E2E tests pasan contra entorno de testing dockerizado
- [ ] Build de producción genera imagen < 50MB para web-client
