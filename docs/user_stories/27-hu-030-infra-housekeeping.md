# HU-030: Housekeeping de infraestructura — reubicación de initial_data y exposición de puertos de BD

## Descripción

Como desarrollador, quiero que el directorio `initial_data` esté en la raíz del monorepo (en lugar de dentro de `docs/db/`) y que el puerto de PostgreSQL esté expuesto en todos los entornos Docker que levantan la base de datos, para simplificar la estructura del proyecto y poder conectarme directamente a la BD desde herramientas externas (DBeaver, psql, etc.) en cualquier entorno.

---

## Contexto técnico

### Situación actual

- El directorio `docs/db/initial_data/` contiene los 56 ficheros JSON del catálogo (55.260 libros). Semánticamente, estos datos **no son documentación** — son datos de negocio que alimentan directamente la BD. Ubicarlos bajo `docs/` es incorrecto.
- El puerto 5432 de PostgreSQL **no está expuesto** en `docker-compose.prod.yml` (comentado intencionalmente) ni en `docker-compose.seed.yml`. Esto impide conectarse directamente a la BD desde el host en esos entornos.

### Situación deseada

- `initial_data/` en la raíz del monorepo, al mismo nivel que `original_data/`, `apps/`, `docs/`, etc.
- Puerto 5432 expuesto en **todos** los docker-compose que levantan un contenedor PostgreSQL:
  - `docker-compose.yml` (dev) — ya expuesto ✅
  - `docker-compose.test.yml` (test) — ya expuesto en 5433 ✅
  - `docker-compose.prod.yml` (prod) — **falta** ❌
  - `docker-compose.seed.yml` (seed) — **falta** ❌

---

## Criterios de aceptación

1. El directorio `initial_data/` existe en la raíz del monorepo y contiene los 56 ficheros JSON del catálogo.
2. El directorio `docs/db/initial_data/` **ya no existe**.
3. Todos los docker-compose, scripts y referencias en el código apuntan a la nueva ruta `./initial_data/`.
4. El puerto 5432 está expuesto en `docker-compose.prod.yml` y `docker-compose.seed.yml`.
5. El README está actualizado para reflejar la nueva estructura.
6. Los tests siguen pasando tras los cambios.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `docs/db/initial_data/` | Mover a `initial_data/` en raíz |
| `docker-compose.prod.yml` | Exponer puerto 5432 + actualizar volume path |
| `docker-compose.seed.yml` | Exponer puerto 5432 + actualizar volume path |
| `docker-compose.yml` | Actualizar volume path del API (si aplica) |
| `docker-compose.consolidate.yml` | Actualizar output path del script |
| `apps/api/scripts/seed-database.ts` | Actualizar `INITIAL_DATA_DIR` default path |
| `apps/api/scripts/consolidate-books.ts` | Actualizar output path |
| `README.md` | Actualizar referencias de rutas y diagrama de flujo |

---

## Tareas técnicas

### Tarea 1 — Mover `initial_data/` a la raíz del monorepo
- Mover físicamente `docs/db/initial_data/` → `initial_data/` en la raíz.
- Actualizar todos los docker-compose (`prod`, `seed`, `consolidate`, `dev`) para montar `./initial_data/` en lugar de `./docs/db/initial_data/`.
- Actualizar los scripts TypeScript (`seed-database.ts`, `consolidate-books.ts`) si tienen referencias hardcodeadas al path.
- Actualizar el `README.md` (diagrama de flujo y comandos).

### Tarea 2 — Exponer puerto PostgreSQL en entornos restantes
- En `docker-compose.prod.yml`: descomentar/agregar `ports: - "5432:5432"` en el servicio `postgres`.
- En `docker-compose.seed.yml`: agregar `ports: - "5432:5432"` en el servicio `postgres`.

---

## Notas

- El fichero `docs/db/init-db.sql` **no se mueve** — ese sí es documentación/referencia de esquema y pertenece en `docs/db/`.
- Exponer el puerto de prod es una decisión consciente para facilitar el acceso desde herramientas de administración. La seguridad de red es responsabilidad del entorno de despliegue (firewall, VPN, etc.).
- No hay cambios en lógica de negocio ni en tests de dominio. Los tests de integración/e2e pueden requerir verificación si referencian rutas.
