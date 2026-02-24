# HU-019: Carga Inicial de Datos en Producción

## Información General

| Campo | Valor |
|-------|-------|
| **ID** | HU-019 |
| **Título** | Carga Inicial de Datos en Producción |
| **Épica** | Datos |
| **Prioridad** | Alta |
| **Estimación** | 2 horas |
| **Rama** | `feature/HU-019-initial-data-load-production` |

---

## Descripción

**Como** administrador del sistema,  
**Quiero** cargar los datos iniciales de libros en la base de datos de producción,  
**Para** tener el catálogo completo de libros disponible en el sistema.

## Contexto

El sistema ha evolucionado para manejar la carga de datos de forma particionada, evitando problemas de memoria con ficheros JSON grandes. Actualmente:

- ✅ Existe el script `consolidate-books.ts` que genera ficheros particionados desde `original_data/`
- ✅ Existe el script `seed-database.ts` que carga los datos desde `docs/db/initial_data/`
- ❌ El fichero antiguo `docs/db/books.json` sigue existiendo (obsoleto)
- ❌ El `docker-compose.prod.yml` referencia el fichero antiguo `books.json`
- ❌ No se han generado los ficheros particionados actualizados
- ❌ No se ha ejecutado la carga en producción

### Flujo de Carga de Datos

```
original_data/*.json
        │
        ▼ (consolidate-books.ts)
docs/db/initial_data/books_XXXX.json
        │
        ▼ (seed-database.ts)
    Base de datos PostgreSQL
```

### Scripts Involucrados

| Script | Ubicación | Propósito |
|--------|-----------|-----------|
| `consolidate-books.ts` | `apps/api/scripts/` | Consolida y traduce libros de `original_data/` a ficheros particionados |
| `seed-database.ts` | `apps/api/scripts/` | Carga los ficheros particionados en la base de datos |

---

## Criterios de Aceptación

### AC-1: Eliminación del Fichero Obsoleto
- [x] El fichero `docs/db/books.json` ha sido eliminado del repositorio
- [x] El historial de git refleja la eliminación

### AC-2: Generación de Ficheros Particionados
- [x] Se han ejecutado el script `consolidate-books.ts` desde el contenedor de la API
- [x] Se han generado los ficheros en `docs/db/initial_data/` con formato `books_XXXX.json`
- [x] Cada fichero contiene máximo 1000 libros (configuración por defecto)
- [x] Las descripciones han sido traducidas al español

### AC-3: Actualización de Docker Compose de Producción
- [x] El volumen del API monta el directorio `./docs/db/initial_data:/app/data/initial_data:ro`
- [x] Se ha eliminado la referencia al antiguo `books.json`
- [x] Los comentarios del fichero están actualizados

### AC-4: Carga en Base de Datos de Producción
- [x] Se ha ejecutado el script `seed-database.ts` en el entorno de producción
- [x] Se genera un reporte con:
  - Total de libros procesados: 1020
  - Libros cargados exitosamente: 1030 (incluyendo 10 existentes)
  - Libros que fallaron: 0
  - Libros omitidos: 0

### AC-5: Verificación de la Carga
- [x] La API responde correctamente al endpoint de listado de libros
- [x] El número de libros en base de datos: 1030
- [x] La búsqueda semántica funciona correctamente (embeddings generados)
- [x] No hay errores en los logs del contenedor

---

## Diseño Técnico

### Cambios en docker-compose.prod.yml

**Antes:**
```yaml
volumes:
  # Mount books.json for seeding (run: docker exec library-api npm run seed:prod)
  - ./docs/db/books.json:/app/data/books.json:ro
```

**Después:**
```yaml
volumes:
  # Mount initial_data directory for seeding (run: docker exec library-api npm run seed:prod)
  - ./docs/db/initial_data:/app/data/initial_data:ro
```

### Estructura de Ficheros Generados

```
docs/db/initial_data/
├── books_0001.json  (hasta 1000 libros)
├── books_0002.json  (hasta 1000 libros)
├── books_0003.json  (hasta 1000 libros)
└── ...
```

### Formato de Reporte de Carga

```
--- Seeding Complete ---
Total processed: 2500
Created: 2450
Skipped (already exist): 30
Errors: 20
Duration: 125.50s

Failed ISBNs:
  - 978-1234567890
  - 978-0987654321
  ... and 18 more
```

---

## Tareas Técnicas

### Tarea 1: Eliminar fichero obsoleto (0.25h)
- Eliminar `docs/db/books.json` del repositorio
- Commit con mensaje descriptivo

### Tarea 2: Actualizar docker-compose.prod.yml (0.25h)
- Modificar el volumen del servicio `api` para montar el directorio `initial_data`
- Actualizar comentarios del fichero
- Verificar que la configuración es correcta

### Tarea 3: Generar ficheros particionados (0.5h)
- Ejecutar `consolidate-books.ts` desde el contenedor de desarrollo
- Verificar que los ficheros se generan correctamente en `docs/db/initial_data/`
- Revisar el reporte de consolidación (duplicados, traducciones, errores)

### Tarea 4: Ejecutar carga en producción (0.5h)
- Levantar el entorno de producción con `docker-compose -f docker-compose.prod.yml up -d`
- Esperar a que todos los servicios estén healthy
- Ejecutar `docker exec library-api npm run seed:prod`
- Documentar el reporte de salida

### Tarea 5: Verificación y documentación (0.5h)
- Verificar que la API responde correctamente
- Consultar el número de libros en base de datos
- Documentar cualquier incidencia o libro fallido
- Actualizar el README si es necesario

---

## Comandos de Ejecución

### Desarrollo (generar ficheros)

```bash
# Generar ficheros particionados desde original_data/
docker exec library-api-dev npm run consolidate:books
```

### Producción (cargar datos)

```bash
# Levantar entorno de producción
docker-compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén healthy
docker-compose -f docker-compose.prod.yml ps

# Ejecutar carga de datos
docker exec library-api npm run seed:prod

# Verificar logs
docker logs library-api
```

### Verificación

```bash
# Verificar número de libros en base de datos
docker exec library-postgres psql -U library -d library -c "SELECT COUNT(*) FROM books;"

# Verificar endpoint de la API
curl http://localhost:3000/api/v1/books | jq '.meta.total'
```

---

## Variables de Entorno Relevantes

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `BOOKS_PER_FILE` | 1000 | Libros por fichero particionado |
| `BATCH_SIZE` | 50 | Libros por batch en la carga |
| `MAX_RETRIES` | 3 | Reintentos para errores de embedding |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Servicio Ollama no disponible | Media | Alto | Verificar health check antes de ejecutar |
| Timeout en traducciones | Media | Medio | El script tiene reintentos configurados |
| Memoria insuficiente | Baja | Alto | Los ficheros particionados evitan este problema |

---

## Dependencias

- ✅ HU-018: Dockerización de Producción - Completada
- ✅ HU-011: Consolidación de libros - Script existente
- ✅ HU-002: Carga inicial de datos - Script de seed existente

---

## Definition of Done

- [x] Fichero `docs/db/books.json` eliminado del repositorio
- [x] Ficheros particionados generados en `docs/db/initial_data/`
- [x] `docker-compose.prod.yml` actualizado con el nuevo volumen
- [x] Carga ejecutada en producción con reporte documentado
- [x] API respondiendo correctamente con los libros cargados
- [x] Commits realizados siguiendo Conventional Commits
- [x] 0 errores de lint, build exitoso
