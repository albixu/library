# Design Doc: HU-009 - Listar Categorias de Libros

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-009 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-21 |
| **Prioridad** | Media |
| **Estimacion** | A definir |
| **Dependencias** | HU-004 (Estandarizar Respuestas API), HU-008 (Type-Category-Level Relationships) |

---

## 1. Historia de Usuario

**Como** usuario del frontend,  
**Quiero** obtener un listado de categorias de libros, opcionalmente filtradas por tipo,  
**Para** poder seleccionar categorias correctas al crear o filtrar libros en la interfaz.

---

## 2. Contexto

Las categorias de libros estan almacenadas en la tabla `categories` de la base de datos. Desde HU-008, cada categoria pertenece a exactamente un tipo de libro (relacion 1:N entre `types` y `categories`).

Actualmente no existe un endpoint para consultar las categorias, lo que obliga al frontend a desconocer las categorias disponibles o hardcodearlas.

Este endpoint es necesario para:
1. Poblar dropdowns/selects en formularios de creacion de libros
2. Mostrar filtros dinamicos por categoria en listados de libros (futuro)
3. Permitir filtrar categorias por tipo de libro para mostrar solo las relevantes
4. Mantener sincronizados frontend y backend

---

## 3. Especificacion del Endpoint

### 3.1 Request

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/categories` | Obtiene categorias, opcionalmente filtradas por tipo |

**Query Parameters:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `type` | string | No | Nombre del tipo de libro para filtrar categorias (case-insensitive) |

**Ejemplos:**
- `GET /api/categories` - Todas las categorias
- `GET /api/categories?type=technical` - Solo categorias del tipo "technical"
- `GET /api/categories?type=NOVEL` - Solo categorias del tipo "novel" (case-insensitive)

**Headers requeridos:** Ninguno

### 3.2 Response Exitosa (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "best practices",
      "typeId": "660e8400-e29b-41d4-a716-446655440001",
      "description": "Books about software development best practices"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "programming",
      "typeId": "660e8400-e29b-41d4-a716-446655440001",
      "description": null
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "software engineering",
      "typeId": "660e8400-e29b-41d4-a716-446655440001",
      "description": "Books about software engineering principles"
    }
  ],
  "error": null
}
```

**Notas:**
- Los resultados vienen **ordenados alfabeticamente** por `name` (A-Z)
- Se devuelven los campos `id`, `name`, `typeId` y `description`
- El campo `description` puede ser `null`
- Si no hay categorias (o ninguna coincide con el filtro), `data` sera un array vacio `[]`

### 3.3 Response con Lista Vacia (200 OK)

Cuando no hay categorias o el tipo no existe:

```json
{
  "success": true,
  "data": [],
  "error": null
}
```

### 3.4 Response de Error (500)

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "An unexpected error occurred"
  }
}
```

---

## 4. Criterios de Aceptacion

| ID | Criterio | Descripcion |
|----|----------|-------------|
| AC-1 | **Endpoint accesible** | `GET /api/categories` responde correctamente |
| AC-2 | **Estructura de respuesta** | Sigue el estandar definido en HU-004: `{ success, data, error }` |
| AC-3 | **Campos retornados** | Cada categoria incluye: `id`, `name`, `typeId`, `description` |
| AC-4 | **Ordenamiento** | Resultados ordenados alfabeticamente por `name` (A-Z) |
| AC-5 | **Sin filtro** | Sin parametro `type`, retorna todas las categorias |
| AC-6 | **Filtro por tipo existente** | Con `?type=technical`, retorna solo categorias de ese tipo |
| AC-7 | **Filtro case-insensitive** | `?type=TECHNICAL` y `?type=technical` dan el mismo resultado |
| AC-8 | **Tipo inexistente** | Si el tipo no existe, retorna `data: []` con status 200 |
| AC-9 | **Lista vacia** | Si no hay categorias, retorna `data: []` con status 200 |
| AC-10 | **Codigo HTTP** | Retorna 200 OK en exito, 500 en error interno |

---

## 5. Arquitectura

### 5.1 Flujo de Datos

```
+-----------------------------------------------------------------------+
|                    GET /api/categories?type=technical                  |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                       CategoriesController                             |
|  - Recibe request                                                      |
|  - Extrae query param 'type' (opcional)                                |
|  - Llama al use case                                                   |
|  - Formatea respuesta con estructura estandar                          |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                      ListCategoriesUseCase                             |
|  - Si type proporcionado: busca el type por nombre                     |
|  - Si type existe: obtiene categorias filtradas por typeId             |
|  - Si type no existe: retorna array vacio                              |
|  - Si no hay filtro: obtiene todas las categorias                      |
|  - Ordena alfabeticamente                                              |
|  - Retorna DTOs con id, name, typeId, description                      |
+-----------------------------------------------------------------------+
                                  |
                         +-------+-------+
                         |               |
                         v               v
+---------------------------+   +---------------------------+
|  TypeRepository (Port)    |   | CategoryRepository (Port) |
|  - findByName(name)       |   | - findAllSorted()         |
+---------------------------+   | - findByTypeIdSorted()    |
                                +---------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------+
|                 PostgresCategoryRepository (Adapter)                   |
|  - Consulta tabla 'categories'                                         |
|  - Ordena por 'name' ASC                                               |
|  - Filtra por 'type_id' si aplica                                      |
|  - Mapea a entidades de dominio                                        |
+-----------------------------------------------------------------------+
```

### 5.2 Estructura de Archivos

```
apps/api-cli/src/
+-- application/
|   +-- ports/
|   |   +-- CategoryRepository.ts          # MODIFICAR: Agregar findAllSorted(), findByTypeIdSorted()
|   +-- use-cases/
|       +-- ListCategoriesUseCase.ts       # NUEVO
|       +-- index.ts                       # MODIFICAR: Exportar nuevo use case
+-- infrastructure/
    +-- driven/
    |   +-- persistence/
    |       +-- PostgresCategoryRepository.ts  # MODIFICAR: Implementar nuevos metodos
    +-- driver/
        +-- http/
            +-- controllers/
            |   +-- CategoriesController.ts    # NUEVO
            +-- routes/
            |   +-- categories.routes.ts       # NUEVO
            |   +-- index.ts                   # MODIFICAR: Registrar nuevas rutas
            +-- schemas/
                +-- category.schemas.ts        # NUEVO
```

---

## 6. Modelo de Datos

### 6.1 DTO de Respuesta

```typescript
/**
 * Category item for list responses
 * Includes all fields except timestamps
 */
interface CategoryListItem {
  id: string;          // UUID
  name: string;        // Nombre de la categoria (normalizado a lowercase)
  typeId: string;      // UUID del tipo al que pertenece
  description: string | null;  // Descripcion opcional
}
```

### 6.2 Tabla de Base de Datos (existente)

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type_id UUID NOT NULL REFERENCES types(id) ON DELETE RESTRICT,
  description VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(name, type_id)
);
```

### 6.3 Query Parameter Schema

```typescript
/**
 * Query parameters for listing categories
 */
interface ListCategoriesQuery {
  type?: string;  // Optional type name filter (case-insensitive)
}
```

---

## 7. Plan de Implementacion

### Tarea 1: Extender CategoryRepository Port

**Descripcion:** Agregar metodos para listar categorias ordenadas.

**Cambios:**
- Agregar metodo `findAllSorted(): Promise<Category[]>` al puerto
- Agregar metodo `findByTypeIdSorted(typeId: string): Promise<Category[]>` al puerto
- Actualizar exportaciones en `index.ts`

**Archivos afectados:**
- `src/application/ports/CategoryRepository.ts`
- `src/application/ports/index.ts`

**Entregables:** Puerto actualizado

---

### Tarea 2: Implementar metodos en PostgresCategoryRepository

**Descripcion:** Implementar los nuevos metodos del puerto.

**Cambios:**
- Implementar `findAllSorted()` con ORDER BY name ASC
- Implementar `findByTypeIdSorted(typeId)` con filtro y ORDER BY name ASC
- Tests unitarios para ambos metodos

**Archivos afectados:**
- `src/infrastructure/driven/persistence/PostgresCategoryRepository.ts`
- `tests/unit/infrastructure/driven/persistence/PostgresCategoryRepository.test.ts`

**Entregables:** Implementacion con tests unitarios

---

### Tarea 3: Tests de integracion PostgresCategoryRepository

**Descripcion:** Tests de integracion para los nuevos metodos.

**Casos a cubrir:**
- `findAllSorted()` retorna categorias ordenadas alfabeticamente
- `findAllSorted()` retorna array vacio si no hay categorias
- `findByTypeIdSorted()` retorna solo categorias del tipo indicado
- `findByTypeIdSorted()` retorna categorias ordenadas alfabeticamente
- `findByTypeIdSorted()` retorna array vacio si el tipo no tiene categorias

**Archivos afectados:**
- `tests/integration/infrastructure/persistence/PostgresCategoryRepository.integration.test.ts`

**Entregables:** Tests de integracion pasando

---

### Tarea 4: Crear ListCategoriesUseCase

**Descripcion:** Crear el caso de uso para listar categorias.

**Cambios:**
- Crear use case con dependencias: `CategoryRepository`, `TypeRepository`
- Metodo `execute(typeName?: string): Promise<CategoryListItem[]>`
- Logica:
  - Si `typeName` proporcionado: buscar type, si existe filtrar por typeId, si no existe retornar []
  - Si no hay filtro: retornar todas las categorias
- Mapear entidades a DTOs (id, name, typeId, description)
- Tests unitarios

**Archivos afectados:**
- `src/application/use-cases/ListCategoriesUseCase.ts` (NUEVO)
- `src/application/use-cases/index.ts`
- `tests/unit/application/use-cases/ListCategoriesUseCase.test.ts` (NUEVO)

**Entregables:** Use case con tests unitarios

---

### Tarea 5: Crear schemas Zod para categorias

**Descripcion:** Crear schemas de validacion para el endpoint.

**Cambios:**
- Crear `category.schemas.ts` con:
  - `listCategoriesQuerySchema`: validacion de query params
  - `categoryListItemSchema`: schema del item de respuesta
  - `categoryListResponseSchema`: schema de respuesta completa

**Archivos afectados:**
- `src/infrastructure/driver/http/schemas/category.schemas.ts` (NUEVO)

**Entregables:** Schemas Zod creados

---

### Tarea 6: Crear CategoriesController

**Descripcion:** Crear controlador HTTP para categorias.

**Cambios:**
- Crear controlador con metodo `list(request, reply)`
- Extraer y validar query param `type`
- Llamar al use case
- Formatear respuesta con estructura estandar
- Tests unitarios

**Archivos afectados:**
- `src/infrastructure/driver/http/controllers/CategoriesController.ts` (NUEVO)
- `tests/unit/infrastructure/driver/http/controllers/CategoriesController.test.ts` (NUEVO)

**Entregables:** Controller con tests unitarios

---

### Tarea 7: Crear rutas de categorias

**Descripcion:** Crear y registrar rutas HTTP.

**Cambios:**
- Crear `categories.routes.ts` con ruta GET /api/categories
- Registrar rutas en el servidor Fastify
- Actualizar `index.ts` de routes

**Archivos afectados:**
- `src/infrastructure/driver/http/routes/categories.routes.ts` (NUEVO)
- `src/infrastructure/driver/http/routes/index.ts`
- `src/infrastructure/driver/http/server.ts`

**Entregables:** Rutas registradas y funcionando

---

### Tarea 8: Tests E2E

**Descripcion:** Tests end-to-end del endpoint.

**Casos a cubrir:**
- `GET /api/categories` retorna todas las categorias ordenadas
- `GET /api/categories?type=technical` retorna categorias filtradas
- `GET /api/categories?type=TECHNICAL` (case-insensitive) funciona igual
- `GET /api/categories?type=nonexistent` retorna array vacio
- Estructura de respuesta `{ success, data, error }` correcta
- Campos de cada categoria correctos

**Archivos afectados:**
- `tests/e2e/http/listCategories.e2e.test.ts` (NUEVO)

**Entregables:** Tests E2E pasando

---

### Tarea 9: Actualizar documentacion OpenAPI

**Descripcion:** Documentar el nuevo endpoint en OpenAPI.

**Cambios:**
- Agregar tag "Categories"
- Agregar endpoint `GET /api/categories`
- Documentar query parameter `type`
- Documentar schemas de respuesta
- Agregar ejemplos

**Archivos afectados:**
- `docs/api/openapi.yaml`

**Entregables:** Documentacion OpenAPI actualizada

---

## 8. Testing

### 8.1 Tests Unitarios Nuevos

| Componente | Tests |
|------------|-------|
| `PostgresCategoryRepository.test.ts` | `findAllSorted()`, `findByTypeIdSorted()` |
| `ListCategoriesUseCase.test.ts` | Sin filtro, con filtro valido, con filtro invalido, lista vacia |
| `CategoriesController.test.ts` | Estructura de respuesta, manejo de query params |

### 8.2 Tests de Integracion

| Componente | Tests |
|------------|-------|
| `PostgresCategoryRepository.integration.test.ts` | Query real con ordenamiento y filtros |

### 8.3 Tests E2E

| Test | Descripcion |
|------|-------------|
| `listCategories.e2e.test.ts` | GET /api/categories sin filtro |
| | GET /api/categories?type=technical |
| | GET /api/categories?type=nonexistent |
| | Validacion de estructura de respuesta |
| | Validacion de ordenamiento |

---

## 9. Respuestas HTTP

| Codigo | Situacion |
|--------|-----------|
| `200 OK` | Lista obtenida exitosamente (incluso si esta vacia) |
| `500 Internal Server Error` | Error inesperado del servidor |

---

## 10. Consideraciones

### 10.1 Performance
- La tabla `categories` es pequena (< 100 registros tipicamente)
- No se requiere paginacion en esta fase
- El indice `categories_type_idx` ya existe para filtrado por tipo
- El indice `categories_name_idx` ya existe para ordenamiento

### 10.2 Seguridad
- Endpoint de solo lectura
- No expone informacion sensible
- No requiere autenticacion (sistema de usuario unico)
- Query params validados con Zod para prevenir inyeccion

### 10.3 Comportamiento del Filtro
- El filtro por tipo es **case-insensitive** (se normaliza a lowercase)
- Si el tipo no existe, se retorna array vacio (no error)
- Esto permite al frontend mostrar "sin resultados" sin manejar errores

### 10.4 Escalabilidad
- Si en el futuro se necesita paginacion, se puede agregar facilmente
- El patron establecido sirve para futuros endpoints de listado con filtros

---

## 11. Definicion de Hecho (DoD)

- [ ] Codigo limpio (Lint/Typecheck OK)
- [ ] Puerto `CategoryRepository` extendido con `findAllSorted()` y `findByTypeIdSorted()`
- [ ] `PostgresCategoryRepository` implementa los nuevos metodos
- [ ] `ListCategoriesUseCase` creado con tests
- [ ] Schemas Zod para categorias creados
- [ ] `CategoriesController` creado con tests
- [ ] Rutas registradas en servidor Fastify
- [ ] Documentacion OpenAPI actualizada
- [ ] Tests unitarios pasando (minimo 80% cobertura)
- [ ] Tests de integracion pasando
- [ ] Tests E2E pasando
- [ ] 0 lint errors, 0 type errors, all tests green, build success

---

## 12. Referencias

- [06-hu-004-standardize-api-responses.md](./06-hu-004-standardize-api-responses.md) - Estructura de respuestas API
- [07-hu-005-list-book-types.md](./07-hu-005-list-book-types.md) - Patron de endpoint de listado
- [08-hu-008-type-category-level-relationships.md](./08-hu-008-type-category-level-relationships.md) - Relacion Type-Category
- [CategoryRepository.ts](../../apps/api-cli/src/application/ports/CategoryRepository.ts) - Puerto actual
