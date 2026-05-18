# HU-040: Recomendaciones de libros personalizadas

## Descripción

**Como** usuario autenticado de la biblioteca digital,  
**Quiero** ver una sección de libros recomendados basada en mis favoritos y mi historial de descargas,  
**Para** descubrir libros relevantes sin tener que buscarlos manualmente.

---

## Contexto y motivación

En HU-039 se implementaron los favoritos por usuario y el registro de descargas en base de datos. Esos datos de comportamiento existen ahora en las tablas `user_book_favorites` y `user_book_downloads`, pero no se explotan para ofrecer ningún valor adicional al usuario.

Esta historia introduce el motor de recomendaciones personalizadas basado en embeddings vectoriales (ya almacenados en la tabla `books` desde HU-037) y un algoritmo de **content-based filtering** con centroide:

- Se unifican los libros marcados como favoritos y los descargados por el usuario en una lista de "libros semilla".
- Se calcula el vector promedio (centroide) normalizado L2 de esos embeddings y se buscan en pgvector los libros más similares usando distancia coseno.
- El resultado se enriquece con la **categoría dominante** del historial del usuario para poder explicar al usuario por qué se le recomienda cada libro.
- El usuario accede a las recomendaciones mediante una ruta dedicada `/recomendaciones`, solo accesible cuando hay sesión activa.

---

## Criterios de Aceptación

### CA-1: Página "Para ti" — visibilidad y acceso
- La página "Para ti" (`/recomendaciones`) es visible **únicamente** para usuarios autenticados; los usuarios sin sesión son redirigidos al catálogo.
- La página es accesible desde el header/nav de la aplicación, con un enlace visible solo para usuarios autenticados.
- Al acceder al endpoint sin JWT válido → `401 Unauthorized`.

### CA-2: Estado sin historial suficiente
- Si el usuario no tiene ningún favorito ni descarga registrada (lista semilla vacía), el endpoint devuelve una lista vacía (`[]`).
- El cliente muestra en ese caso el mensaje: _"Marca favoritos o descarga libros para recibir recomendaciones personalizadas"_.
- No se muestra ningún error ni indicador de carga indefinido.

### CA-3: Algoritmo de recomendación
- Las recomendaciones se calculan a partir de la unión de `bookId` de favoritos y descargas del usuario, eliminando duplicados.
- El centroide se obtiene como el promedio element-wise de todos los embeddings de los libros semilla, normalizado L2.
- Se usa búsqueda por similitud coseno en pgvector con un umbral mínimo de similitud del 55% (igual que la búsqueda semántica existente).
- Se devuelven como máximo **20 recomendaciones** ordenadas por similitud descendente.

### CA-4: Exclusiones del resultado
- Los libros que forman parte de la lista semilla del usuario (ya favoritos o ya descargados) **no aparecen** en las recomendaciones.
- Los libros sin embedding almacenado **no aparecen** en las recomendaciones.

### CA-5: Enriquecimiento con categoría dominante
- Cada recomendación incluye la **categoría dominante** del historial del usuario: la categoría más frecuente entre los libros semilla.
- Esta información se muestra en el cliente como una etiqueta _"porque te interesa {categoría}"_ en cada tarjeta de libro recomendado.
- En caso de empate entre categorías, se selecciona la primera en orden alfabético.

### CA-6: Presentación de cada libro recomendado
- Cada libro recomendado muestra: portada/ícono, título, autor y la etiqueta de categoría dominante.
- Los libros son clicables y abren el diálogo de descripción de la misma forma que en el catálogo principal.
- Los botones de acción disponibles son los mismos que en el catálogo: marcar favorito, descargar, enviar a Kindle.

### CA-7: Endpoint `GET /api/books/recommendations`
- Requiere JWT válido (leído desde la cookie `access_token`). Sin token válido → `401 Unauthorized`.
- Devuelve un array de objetos con los campos: `id`, `title`, `author`, `category`, `dominantCategory`, `score` (similitud coseno).
- Si no hay recomendaciones disponibles → devuelve `200 OK` con array vacío `[]`.

### CA-8: Tests
- Tests unitarios para toda la lógica de dominio: cálculo del centroide, normalización L2, determinación de categoría dominante y `GetRecommendationsUseCase`.
- Tests de integración para el repositorio (`findEmbeddingsByIds`, `findAllByUser` en `DownloadRepository`) y para el endpoint.
- Tests E2E para el flujo completo: usuario con historial recibe recomendaciones; usuario sin historial recibe lista vacía.
- Cobertura mínima del 80% en el código nuevo.

---

## Diseño técnico de alto nivel

### Tipos de output de dominio

```typescript
// src/domain/recommendation/RecommendationItem.ts
RecommendationItem {
  bookId: BookId
  title: string
  author: string
  category: string
  dominantCategory: string   // categoría más frecuente entre los libros semilla
  score: number              // similitud coseno [0..1]
}

// src/domain/recommendation/GetRecommendationsOutput.ts
GetRecommendationsOutput {
  items: RecommendationItem[]
  dominantCategory: string | null   // null si la lista semilla está vacía
}
```

### Flujo interno (Hexagonal Architecture)

```
GET /api/books/recommendations
  → [requireAuth middleware] verifyAccessToken(cookie)
  → GetRecommendationsUseCase
      → FavoriteRepository.findAllByUser(userId)         [Port — ya existe]
      → DownloadRepository.findAllByUser(userId)          [Port — nuevo método]
      → [si lista semilla vacía → return { items: [], dominantCategory: null }]
      → BookRepository.findEmbeddingsByIds(seedIds)       [Port — nuevo método]
      → calcular centroide (promedio element-wise + normalización L2)
      → determinar categoría dominante (moda de categorías de libros semilla)
      → BookRepository.findSimilarByCentroid(centroid, { threshold: 0.55, limit: 20, exclude: seedIds })
      → mapear resultados a RecommendationItem[] con dominantCategory
      → Response: GetRecommendationsOutput
```

### Cambios en puertos existentes

```typescript
// src/domain/download/ports/DownloadRepository.ts — nuevo método
findAllByUser(userId: UserId): Promise<BookId[]>

// src/domain/book/ports/BookRepository.ts — nuevo método
findEmbeddingsByIds(ids: BookId[]): Promise<Array<{ id: BookId; embedding: number[]; category: string }>>
```

### Esquema de base de datos — índice nuevo

```sql
-- Índice faltante en user_book_downloads para el nuevo método findAllByUser
CREATE INDEX idx_user_book_downloads_user_id ON user_book_downloads (user_id);
```

### Cambios en la API

| Método | Ruta | Cambio |
|---|---|---|
| `GET` | `/api/books/recommendations` | **NUEVO** — recomendaciones personalizadas, requiere JWT |

### Algoritmo del centroide (pseudocódigo)

```typescript
function computeCentroid(embeddings: number[][]): number[] {
  const dim = embeddings[0].length;
  const sum = new Array(dim).fill(0);
  for (const vec of embeddings) {
    for (let i = 0; i < dim; i++) sum[i] += vec[i];
  }
  const mean = sum.map(v => v / embeddings.length);
  // Normalización L2
  const norm = Math.sqrt(mean.reduce((acc, v) => acc + v * v, 0));
  return norm === 0 ? mean : mean.map(v => v / norm);
}
```

### Cambios en el cliente web

| Componente / Servicio | Cambio |
|---|---|
| `RecommendationsPageComponent` (nuevo) | Página completa en la ruta `/recomendaciones`; muestra la lista de recomendaciones con tarjetas; gestiona el estado vacío con mensaje motivacional |
| `RecommendationsService` (nuevo) | `getRecommendations(): Observable<RecommendationItem[]>` — llama a `GET /api/books/recommendations` |
| `AppRoutingModule` / router | Añadir ruta `/recomendaciones` protegida con guard de autenticación |
| `AppHeaderComponent` / nav | Añade enlace "Para ti" en el header visible solo para usuarios autenticados |

El estado de autenticación se consume desde el `AuthService` (HU-038) mediante Signal. El estado de las recomendaciones se gestiona con Signals locales en `RecommendationsPageComponent` (`loading`, `items`, `error`).

---

## Tareas técnicas

### Tarea 1 — DB: índice en `user_book_downloads` y extensión de puertos
**Branch**: `task/HU-040-01-db-index-and-ports`

- [ ] Crear migración Drizzle que añada el índice `idx_user_book_downloads_user_id` en la tabla `user_book_downloads`.
- [ ] Ejecutar `npm run db:generate && npm run db:migrate` y verificar que aplica correctamente.
- [ ] Añadir método `findAllByUser(userId: UserId): Promise<BookId[]>` a la interfaz `DownloadRepository` en `src/domain/download/ports/DownloadRepository.ts`.
- [ ] Añadir método `findEmbeddingsByIds(ids: BookId[]): Promise<Array<{ id: BookId; embedding: number[]; category: string }>>` a la interfaz `BookRepository` en `src/domain/book/ports/BookRepository.ts`.

### Tarea 2 — Dominio: tipos de output y lógica del centroide
**Branch**: `task/HU-040-02-domain`

- [ ] Crear tipo `RecommendationItem` en `src/domain/recommendation/RecommendationItem.ts`.
- [ ] Crear tipo `GetRecommendationsOutput` en `src/domain/recommendation/GetRecommendationsOutput.ts`.
- [ ] Implementar función pura `computeCentroid(embeddings: number[][]): number[]` en `src/domain/recommendation/centroid.ts` (promedio element-wise + normalización L2).
- [ ] Implementar función pura `getDominantCategory(categories: string[]): string | null` en `src/domain/recommendation/dominantCategory.ts` (moda, desempate alfabético).
- [ ] Tests unitarios para `computeCentroid` (caso normal, vector único, vector nulo) y `getDominantCategory` (caso normal, empate, array vacío).

### Tarea 3 — Caso de uso: `GetRecommendationsUseCase`
**Branch**: `task/HU-040-03-use-case`

- [ ] Implementar `GetRecommendationsUseCase` en `src/application/use-cases/recommendation/GetRecommendationsUseCase.ts`.
- [ ] El caso de uso orquesta: obtener semillas → guardia de lista vacía → obtener embeddings → calcular centroide → obtener categoría dominante → buscar similares → excluir semillas → mapear a `RecommendationItem[]`.
- [ ] Inyectar `FavoriteRepository`, `DownloadRepository` y `BookRepository` como puertos.
- [ ] Tests unitarios cubriendo: lista semilla vacía, usuario con solo favoritos, usuario con solo descargas, exclusión correcta de semillas, límite de 20 resultados, umbral de similitud.

### Tarea 4 — Adaptadores: `DrizzleDownloadRepository` y `PostgresBookRepository`
**Branch**: `task/HU-040-04-infra-adapters`

- [ ] Implementar el método `findAllByUser` en `DrizzleDownloadRepository` en `src/infrastructure/db/repositories/DrizzleDownloadRepository.ts`.
- [ ] Implementar el método `findEmbeddingsByIds` en `PostgresBookRepository` (o `DrizzleBookRepository`) en `src/infrastructure/db/repositories/`.
- [ ] Asegurar que `findEmbeddingsByIds` filtra automáticamente los registros sin embedding (`embedding IS NOT NULL`).
- [ ] Tests de integración para ambos métodos nuevos (ejecutar en Docker con base de datos real).

### Tarea 5 — HTTP: endpoint `GET /api/books/recommendations`
**Branch**: `task/HU-040-05-http`

- [ ] Registrar ruta `GET /api/books/recommendations` en Fastify con middleware `requireAuth`.
- [ ] Definir schema Zod de respuesta: array de `RecommendationItem` con los campos `id`, `title`, `author`, `category`, `dominantCategory`, `score`.
- [ ] Implementar el controller que invoca `GetRecommendationsUseCase` y mapea la respuesta al schema Zod.
- [ ] Mapear error `UnauthorizedError` → `401 Unauthorized`.
- [ ] Tests E2E del endpoint cubriendo: `401` sin token, `200` con lista vacía, `200` con recomendaciones.

### Tarea 6 — Web client: página "Para ti"
**Branch**: `task/HU-040-06-web`

- [ ] Crear `RecommendationsService` en `apps/web-client/src/app/recommendations/services/recommendations.service.ts` con método `getRecommendations(): Observable<RecommendationItem[]>`.
- [ ] Crear `RecommendationsPageComponent` en `apps/web-client/src/app/recommendations/pages/recommendations-page/` con:
  - Estado gestionado con Signals (`loading`, `items`, `error`).
  - Tarjetas de libro con portada/ícono, título, autor y etiqueta _"porque te interesa {categoría}"_.
  - Botones de acción (favorito, descarga, enviar a Kindle) idénticos a los del catálogo.
  - Mensaje motivacional cuando `items` está vacío.
  - Los libros son clicables y abren el diálogo de descripción existente.
- [ ] Registrar la ruta `/recomendaciones` en el router de Angular protegida con un guard de autenticación que redirige a `/books` si no hay sesión activa.
- [ ] Añadir enlace "Para ti" en el header visible solo para usuarios autenticados.
- [ ] Tests unitarios de `RecommendationsPageComponent` y `RecommendationsService`.

### Tarea 7 — Documentación OpenAPI
**Branch**: `task/HU-040-07-openapi-docs`

- [ ] Documentar el nuevo endpoint `GET /api/books/recommendations` en `docs/api/openapi.yaml`.
- [ ] Incluir el schema de respuesta con todos los campos de `RecommendationItem` (`id`, `title`, `author`, `category`, `dominantCategory`, `score`).
- [ ] Documentar las respuestas `200` (con y sin recomendaciones) y `401`.

---

## Dependencias externas

| Dependencia | Motivo |
|---|---|
| HU-038 (JWT Auth) | `requireAuth` middleware, cookie `access_token`, `UserId` Value Object |
| HU-039 (Favoritos y Descargas) | `FavoriteRepository.findAllByUser()`, tabla `user_book_favorites`, tabla `user_book_downloads` |
| HU-037 (Embeddings) | Embeddings vectoriales almacenados en la tabla `books`; extensión `pgvector` ya instalada |
| `pgvector` (ya instalado) | Búsqueda por similitud coseno mediante operador `<=>` |
| Drizzle ORM (ya instalado) | Nuevos métodos en repositorios existentes |
| Angular Material Symbols (ya configurado) | Iconos de acción en las tarjetas de recomendación |

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El cálculo del centroide puede ser lento si el usuario tiene muchos libros semilla | Limitar los libros semilla a los 50 más recientes (por `created_at` / `downloaded_at`) en una iteración futura; en MVP se procesan todos |
| La búsqueda vectorial en pgvector puede ser costosa sin índice HNSW o IVFFlat | Añadir índice `ivfflat` en la columna `embedding` si el rendimiento degrada con el catálogo real; monitorizar con `EXPLAIN ANALYZE` |
| Si todos los libros semilla no tienen embedding, el centroide no puede calcularse | El caso de uso devuelve lista vacía si `findEmbeddingsByIds` retorna un array vacío; se comporta igual que "sin historial" |
| El endpoint comparte prefijo `/api/books/` con rutas parametrizadas existentes (`:id`) | Registrar la ruta `/api/books/recommendations` **antes** que `/api/books/:id` en Fastify para evitar que `recommendations` sea interpretado como un ID |
| El cambio en `BookRepository` port obliga a actualizar todos sus adaptadores actuales | Revisar todos los adaptadores que implementen `BookRepository` antes del merge de la tarea 4; añadir implementación vacía con `throw new Error('not implemented')` como guardia temporal |

---

**Historia creada**: Lunes, 18 de Mayo, 2026  
**Estimación**: 8-10 horas  
**Prioridad**: Media  
**Complejidad**: Alta
