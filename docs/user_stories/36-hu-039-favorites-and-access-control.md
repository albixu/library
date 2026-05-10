# HU-039: Control de Acceso y Favoritos

## Descripción

**Como** usuario de la biblioteca digital,  
**Quiero** que la interfaz se adapte según mi estado de autenticación y poder marcar libros como favoritos,  
**Para** tener una experiencia personalizada y acceder rápidamente a los libros que más me interesan.

---

## Contexto y motivación

En HU-038 se implementó el sistema de autenticación JWT. Sin embargo, la UI no aprovecha aún ese estado de sesión: la columna de acciones y el botón "Send to Kindle" son visibles para cualquier visitante aunque no pueda usarlos. Además, no existe ningún mecanismo de personalización por usuario.

Esta historia completa la integración entre el sistema de identidad y la capa de presentación:

- Los usuarios no autenticados ven el catálogo completo pero sin la columna de acciones.
- Los usuarios autenticados ganan la capacidad de marcar favoritos y filtrar por ellos.
- El flujo de "Send to Kindle" registra la descarga en base de datos, sentando las bases para estadísticas futuras.

---

## Criterios de Aceptación

### CA-1: Columna de acciones — usuario no autenticado
- La columna "Acciones" de `BookTableComponent` desaparece completamente para usuarios sin sesión: ni la cabecera ni las celdas son renderizadas.
- El resto de la tabla (columnas, paginación, filtros por isbn, título, autor, tipo, categorías y nivel) funciona con normalidad.

### CA-2: Columna de acciones — usuario autenticado
- Los usuarios con sesión activa ven la columna "Acciones" con dos iconos:
  - Icono existente `send_to_mobile` (material-symbols-outlined) — "Send to Kindle".
  - Nuevo icono de favorito que refleja visualmente el estado actual del libro (favorito / no favorito).

### CA-3: Toggle de favorito
- Al pulsar el icono de favorito en un libro que **no** es favorito → el libro se añade a los favoritos del usuario y el icono cambia al estado activo.
- Al pulsar el icono de favorito en un libro que **ya es** favorito → el libro se elimina de los favoritos y el icono vuelve al estado inactivo.
- La operación es por usuario: los favoritos de un usuario no afectan a los de otro.

### CA-4: Filtro "Mis favoritos"
- El panel de filtros (`FilterPanelComponent`) muestra un checkbox "Mis favoritos" **solo** cuando hay sesión activa.
- Con el checkbox marcado → la petición a `GET /api/books` incluye el parámetro `favorites: true` y la tabla muestra únicamente los libros marcados como favoritos por el usuario.
- Con el checkbox desmarcado → el parámetro `favorites` no se envía y la tabla muestra el catálogo completo.

### CA-5: Registro de descarga al enviar a Kindle
- Al ejecutar "Send to Kindle" con éxito → además del envío por email, se registra en base de datos que ese usuario descargó ese libro (upsert: si ya existía la entrada se actualiza la fecha).
- Solo se almacena la última fecha de descarga por par usuario+libro; no se acumulan registros.

### CA-6: Endpoint `POST /api/books/:id/favorite`
- Requiere JWT válido (leído desde la cookie `access_token`). Sin token válido → `401 Unauthorized`.
- Comportamiento toggle: si el libro no estaba en favoritos lo añade (`201 Created`); si ya estaba lo elimina (`200 OK`).
- El cuerpo de respuesta incluye el estado resultante: `{ favorite: boolean }`.
- Si el libro no existe → `404 Not Found`.

### CA-7: Parámetro `favorites` en `GET /api/books`
- Acepta el nuevo parámetro de query opcional `favorites=true`.
- Si hay JWT válido y `favorites=true` → devuelve solo los libros marcados como favoritos por ese usuario.
- Si **no** hay JWT válido y se envía `favorites=true` → el parámetro se ignora silenciosamente (no lanza error) y se devuelve el catálogo completo.

### CA-8: Registro de descarga en `POST /api/books/:id/send`
- Además de enviar el email (comportamiento existente, sin cambios), registra la descarga en la tabla `user_book_downloads` (upsert por `userId + bookId`).
- Requiere JWT válido; sin token → el email se envía igualmente pero no se registra la descarga (retrocompatibilidad).

### CA-9: Tests
- Tests unitarios para toda la lógica de dominio: entidades, Value Objects y casos de uso nuevos.
- Tests de integración para los tres endpoints nuevos/modificados.
- Tests E2E para los flujos de toggle de favorito y filtrado.
- Cobertura mínima del 80% en el código nuevo.

---

## Diseño técnico de alto nivel

### Entidades y Value Objects de dominio

```typescript
// src/domain/favorite/Favorite.ts
Favorite {
  userId: UserId    // Value Object (UUID) — reutilizado de HU-038
  bookId: BookId    // Value Object (UUID)
  createdAt: Date
}

// src/domain/download/Download.ts
Download {
  userId: UserId
  bookId: BookId
  downloadedAt: Date
}
```

### Flujos (Hexagonal Architecture)

```
POST /api/books/:id/favorite
  → [JWT middleware helper] verifyAccessToken(cookie)
  → ToggleFavoriteUseCase
      → FavoriteRepository.findByUserAndBook()   [Port]
      → FavoriteRepository.add() | remove()      [Port]
      → Response: { favorite: boolean }

GET /api/books?favorites=true
  → [JWT middleware helper] extractUserIfPresent(cookie)  // no lanza error si no hay token
  → SearchBooksUseCase (modificado)
      → BookRepository.findAll({ ..., favoritesOf: userId | undefined })  [Port]
      → Response: Book[]

POST /api/books/:id/send
  → SendToKindleUseCase (modificado)
      → EmailPort.send()                          [Port]  // sin cambios
      → [si hay userId] DownloadRepository.upsert()      [Port]
      → Response: { sent: boolean }
```

### Esquema de base de datos

```sql
-- Tabla user_book_favorites
CREATE TABLE user_book_favorites (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

-- Tabla user_book_downloads
CREATE TABLE user_book_downloads (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
```

### Cambios en la API

| Método | Ruta | Cambio |
|---|---|---|
| `POST` | `/api/books/:id/favorite` | **NUEVO** — toggle favorito, requiere JWT |
| `GET` | `/api/books` | **MODIFICADO** — acepta `favorites=true` opcional |
| `POST` | `/api/books/:id/send` | **MODIFICADO** — registra descarga en DB (upsert) |

### Helper JWT para rutas existentes

Para no romper rutas que actualmente son públicas, se introduce un helper de extracción opcional de identidad:

```typescript
// src/infrastructure/http/middleware/extractUserIfPresent.ts
// Lee la cookie access_token. Si es válida devuelve el userId; si no, devuelve undefined.
// Nunca lanza error — permite que rutas públicas mantengan su comportamiento.
async function extractUserIfPresent(request): Promise<UserId | undefined>
```

El endpoint `POST /api/books/:id/favorite` usa en cambio un helper estricto que sí lanza `401`:

```typescript
// src/infrastructure/http/middleware/requireAuth.ts
async function requireAuth(request): Promise<UserId>  // lanza UnauthorizedError si no hay token válido
```

### Cambios en el cliente web

| Componente | Cambio |
|---|---|
| `BookTableComponent` | Oculta columna "Acciones" (cabecera + celdas) si `!isAuthenticated` |
| `BookTableComponent` | Añade icono de favorito con estado visual reactivo por fila |
| `FilterPanelComponent` | Añade checkbox "Mis favoritos" visible solo si `isAuthenticated` |
| `SearchFilters` (tipo) | Añade campo opcional `favorites?: boolean` |
| `BookService` / `FavoriteService` | Nuevo `FavoriteService` con método `toggleFavorite(bookId)` |

El estado de autenticación se consume desde el `AuthService` (HU-038) mediante Signal.

---

## Tareas técnicas

### Tarea 1 — DB: nuevas tablas `user_book_favorites` y `user_book_downloads`
**Branch**: `task/HU-039-01-db-schema`

- [ ] Crear migración Drizzle con las tablas `user_book_favorites` y `user_book_downloads`.
- [ ] Definir los schemas Drizzle correspondientes en `src/infrastructure/db/schema/`.
- [ ] Ejecutar `npm run db:generate && npm run db:migrate` y verificar que aplica correctamente.

### Tarea 2 — Dominio: entidades, puertos y errores
**Branch**: `task/HU-039-02-domain`

- [ ] Crear entidad `Favorite` en `src/domain/favorite/Favorite.ts` (constructor privado, `create()` / `fromPersistence()`).
- [ ] Crear entidad `Download` en `src/domain/download/Download.ts`.
- [ ] Reutilizar `BookId` y `UserId` existentes.
- [ ] Definir interfaz `FavoriteRepository` en `src/domain/favorite/ports/FavoriteRepository.ts`:
  - `findByUserAndBook(userId, bookId): Promise<Favorite | null>`
  - `add(favorite: Favorite): Promise<void>`
  - `remove(userId, bookId): Promise<void>`
  - `findAllByUser(userId): Promise<BookId[]>`
- [ ] Definir interfaz `DownloadRepository` en `src/domain/download/ports/DownloadRepository.ts`:
  - `upsert(download: Download): Promise<void>`
- [ ] Crear error de dominio `BookNotFoundError` si no existe aún.
- [ ] Tests unitarios para entidades y Value Objects.

### Tarea 3 — Casos de uso: favoritos y descarga
**Branch**: `task/HU-039-03-use-cases`

- [ ] Implementar `ToggleFavoriteUseCase` en `src/application/use-cases/favorite/ToggleFavoriteUseCase.ts`:
  - Recibe `userId` y `bookId`.
  - Si existe → elimina y devuelve `{ favorite: false }`.
  - Si no existe → crea y devuelve `{ favorite: true }`.
- [ ] Modificar `SearchBooksUseCase` para aceptar `favoritesOf?: UserId` y filtrar en consecuencia.
- [ ] Implementar `RegisterDownloadUseCase` en `src/application/use-cases/download/RegisterDownloadUseCase.ts`:
  - Recibe `userId` y `bookId`.
  - Delega el upsert en `DownloadRepository`.
- [ ] Tests unitarios para los tres casos de uso cubriendo casos feliz y de error.

### Tarea 4 — Infraestructura: adaptadores Drizzle
**Branch**: `task/HU-039-04-infra-adapters`

- [ ] Implementar `DrizzleFavoriteRepository` en `src/infrastructure/db/repositories/DrizzleFavoriteRepository.ts`.
- [ ] Implementar `DrizzleDownloadRepository` en `src/infrastructure/db/repositories/DrizzleDownloadRepository.ts`.
- [ ] Modificar `DrizzleBookRepository` para soportar el filtro `favoritesOf` (JOIN con `user_book_favorites`).
- [ ] Tests de integración de los tres repositorios.

### Tarea 5 — HTTP: endpoints y middlewares
**Branch**: `task/HU-039-05-http`

- [ ] Crear helper `requireAuth` en `src/infrastructure/http/middleware/requireAuth.ts`.
- [ ] Crear helper `extractUserIfPresent` en `src/infrastructure/http/middleware/extractUserIfPresent.ts`.
- [ ] Registrar ruta `POST /api/books/:id/favorite` con `requireAuth` y schema Zod de respuesta.
- [ ] Modificar handler de `GET /api/books` para extraer userId opcionalmente y pasar `favorites` al caso de uso.
- [ ] Modificar handler de `POST /api/books/:id/send` para invocar `RegisterDownloadUseCase` si hay userId.
- [ ] Mapear errores de dominio a códigos HTTP (`401`, `404`).
- [ ] Tests E2E de los tres endpoints.

### Tarea 6 — Web client: control de acceso y favoritos
**Branch**: `task/HU-039-06-web`

- [ ] Inyectar `AuthService` en `BookTableComponent`; ocultar columna "Acciones" con `@if (isAuthenticated())`.
- [ ] Añadir icono de favorito (material-symbols-outlined) en la columna de acciones con binding de estado.
- [ ] Crear `FavoriteService` en `apps/web-client/src/app/books/services/FavoriteService.ts` con método `toggleFavorite(bookId: string): Observable<{ favorite: boolean }>`.
- [ ] Actualizar el tipo `SearchFilters` para incluir el campo `favorites?: boolean`.
- [ ] Añadir checkbox "Mis favoritos" en `FilterPanelComponent` con `@if (isAuthenticated())`.
- [ ] Emitir `favorites: true` en el evento de filtro cuando el checkbox está marcado; omitir el campo cuando no lo está.
- [ ] Tests unitarios de `BookTableComponent`, `FilterPanelComponent` y `FavoriteService`.

### Tarea 7 — Documentación OpenAPI
**Branch**: `task/HU-039-07-openapi-docs`

- [ ] Documentar el nuevo endpoint `POST /api/books/:id/favorite` en `docs/api/openapi.yaml`.
- [ ] Actualizar la documentación de `GET /api/books` con el parámetro `favorites`.
- [ ] Actualizar la documentación de `POST /api/books/:id/send` con el comportamiento de registro de descarga.
- [ ] Incluir schemas de request, respuestas exitosas y errores (`401`, `404`).

---

## Dependencias externas

| Dependencia | Motivo |
|---|---|
| HU-038 (JWT Auth) | `JwtService.verifyAccessToken()`, cookie `access_token`, `UserId` Value Object |
| `jsonwebtoken` (ya instalado en HU-038) | Verificación del token en los nuevos middlewares |
| Drizzle ORM (ya instalado) | Nuevos schemas y repositorios |
| Angular Material Symbols (ya configurado) | Icono de favorito en la columna de acciones |

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El parámetro `favorites` ignorado silenciosamente puede generar confusión en el cliente | Documentar el comportamiento en OpenAPI con claridad; el cliente solo lo envía si hay sesión activa |
| El JOIN de favoritos en `GET /api/books` puede impactar el rendimiento con grandes catálogos | Añadir índice en `user_book_favorites(user_id)` desde la migración inicial |
| Modificar `SearchBooksUseCase` puede romper tests existentes de búsqueda | Parametrizar `favoritesOf` como opcional con valor por defecto `undefined`; ejecutar suite completa antes de merge |
| El upsert de descarga falla silenciosamente si no hay userId | Comportamiento esperado (retrocompatibilidad); logear el intento en modo debug para facilitar diagnóstico |

---

**Historia creada**: Domingo, 10 de Mayo, 2026  
**Estimación**: 8-10 horas  
**Prioridad**: Media  
**Complejidad**: Alta
