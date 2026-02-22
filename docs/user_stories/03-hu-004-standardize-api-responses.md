# Design Doc: HU-004 - Estandarizar Estructura de Respuestas API

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-004 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-20 |
| **Prioridad** | Alta |
| **Estimación** | A definir |

---

## 1. Historia de Usuario

**Como** consumidor de la API (frontend o cliente externo),  
**Quiero** que todas las respuestas de la API tengan una estructura consistente y predecible,  
**Para** simplificar el manejo de respuestas en el cliente y tener un contrato claro entre frontend y backend.

---

## 2. Contexto y Motivacion

Actualmente, el endpoint `POST /books` devuelve el objeto directamente en caso de exito y un objeto `{ error, details? }` en caso de error. Esta inconsistencia dificulta:

1. **Parsing en el cliente**: Hay que verificar el status code Y la estructura del body para determinar el resultado.
2. **Manejo de errores**: La estructura de error varia segun el tipo de error.
3. **Escalabilidad**: Cada nuevo endpoint podria implementar su propia estructura.

Esta historia establece un **contrato uniforme** para todas las respuestas de la API.

---

## 3. Especificacion de la Estructura

### 3.1 Respuesta Exitosa

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `success` | `boolean` | Siempre `true` en respuestas exitosas |
| `data` | `object \| array \| null` | Datos de la respuesta. Puede ser objeto, array o null segun el endpoint |
| `error` | `null` | Siempre `null` en respuestas exitosas |

### 3.2 Respuesta de Error

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Descripcion del error",
    "details": ["detalle 1", "detalle 2"]
  }
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `success` | `boolean` | Siempre `false` en respuestas de error |
| `data` | `null` | Siempre `null` en respuestas de error |
| `error.message` | `string` | Mensaje descriptivo del error |
| `error.details` | `string[]` | Array de detalles adicionales (opcional, principalmente para errores de validacion) |

### 3.3 Codigos HTTP

Los codigos HTTP semanticos se **mantienen** para permitir manejo estandar por parte de clientes HTTP:

| Codigo | Uso |
|--------|-----|
| `200 OK` | Operacion exitosa (GET, PUT, DELETE) |
| `201 Created` | Recurso creado exitosamente (POST) |
| `400 Bad Request` | Error de validacion o datos invalidos |
| `404 Not Found` | Recurso no encontrado |
| `409 Conflict` | Conflicto (duplicados) |
| `500 Internal Server Error` | Error interno del servidor |
| `503 Service Unavailable` | Servicio externo no disponible |

---

## 4. Criterios de Aceptacion

### 4.1 Estructura de Respuesta

| Criterio | Descripcion |
|----------|-------------|
| **Consistencia** | TODAS las respuestas de la API deben seguir la estructura `{ success, data, error }` |
| **Exito** | En respuestas exitosas: `success: true`, `data: <datos>`, `error: null` |
| **Error** | En respuestas de error: `success: false`, `data: null`, `error: { message, details? }` |
| **Backward compatible** | El refactor debe mantener los mismos codigos HTTP que existian |

### 4.2 Endpoint Afectado

| Endpoint | Cambio Requerido |
|----------|------------------|
| `POST /api/books` | Envolver respuesta en nueva estructura |

### 4.3 Componentes a Modificar

| Componente | Cambio |
|------------|--------|
| `HttpErrorMapper` | Retornar estructura `{ success: false, data: null, error: { message, details? } }` |
| `BooksController` | Envolver respuesta exitosa en `{ success: true, data: <book>, error: null }` |
| `book.schemas.ts` | Actualizar tipos de respuesta |
| `openapi.yaml` | Actualizar esquemas de respuesta |
| Tests | Actualizar assertions para nueva estructura |

---

## 5. Ejemplos de Respuestas

### 5.1 POST /api/books - Exito (201)

**Antes:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Clean Code",
  "authors": [{ "id": "...", "name": "Robert C. Martin" }],
  ...
}
```

**Despues:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Clean Code",
    "authors": [{ "id": "...", "name": "Robert C. Martin" }],
    ...
  },
  "error": null
}
```

### 5.2 POST /api/books - Error de Validacion (400)

**Antes:**
```json
{
  "error": "Validation failed",
  "details": ["title is required", "authors is required"]
}
```

**Despues:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Validation failed",
    "details": ["title is required", "authors is required"]
  }
}
```

### 5.3 POST /api/books - ISBN Duplicado (409)

**Antes:**
```json
{
  "error": "A book with ISBN \"9780132350884\" already exists"
}
```

**Despues:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "A book with ISBN \"9780132350884\" already exists"
  }
}
```

### 5.4 POST /api/books - Servicio No Disponible (503)

**Antes:**
```json
{
  "error": "Embedding service unavailable, please try again later"
}
```

**Despues:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Embedding service unavailable, please try again later"
  }
}
```

---

## 6. Arquitectura

### 6.1 Cambios en Capa de Infraestructura (Driver HTTP)

```
infrastructure/driver/http/
├── schemas/
│   └── common.schemas.ts     # NUEVO: Esquemas comunes de respuesta
│   └── book.schemas.ts       # MODIFICAR: Usar esquemas comunes
├── errors/
│   └── HttpErrorMapper.ts    # MODIFICAR: Nueva estructura de error
├── controllers/
│   └── BooksController.ts    # MODIFICAR: Envolver respuestas exitosas
└── routes/
    └── books.routes.ts       # SIN CAMBIOS
```

### 6.2 Nuevos Tipos

```typescript
// common.schemas.ts

/**
 * Error structure for API responses
 */
interface ApiError {
  message: string;
  details?: string[];
}

/**
 * Standard API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

/**
 * Success response helper
 */
function successResponse<T>(data: T): ApiResponse<T>;

/**
 * Error response helper
 */
function errorResponse(message: string, details?: string[]): ApiResponse<never>;
```

---

## 7. Plan de Implementacion

### Tarea 1: Crear esquemas comunes de respuesta
- Crear `common.schemas.ts` con tipos y helpers
- Definir `ApiResponse<T>`, `ApiError`
- Crear funciones helper `successResponse()` y `errorResponse()`

### Tarea 2: Refactorizar HttpErrorMapper
- Modificar `HttpErrorResponse` para usar nueva estructura
- Actualizar `mapErrorToHttpResponse()` para retornar `{ success: false, data: null, error: { message, details? } }`
- Actualizar tests unitarios

### Tarea 3: Refactorizar BooksController
- Importar helpers de `common.schemas.ts`
- Envolver respuesta exitosa en `successResponse()`
- Actualizar tests unitarios

### Tarea 4: Actualizar documentacion OpenAPI
- Definir esquemas `ApiSuccessResponse` y `ApiErrorResponse`
- Actualizar todas las respuestas de `POST /books`
- Agregar ejemplos actualizados

### Tarea 5: Actualizar tests de integracion y E2E
- Modificar assertions para validar nueva estructura
- Verificar que todos los tests pasen

---

## 8. Testing

### 8.1 Tests Unitarios

| Componente | Tests a Actualizar/Crear |
|------------|--------------------------|
| `HttpErrorMapper.test.ts` | Verificar nueva estructura de error |
| `BooksController.test.ts` | Verificar estructura de respuesta exitosa |

### 8.2 Tests de Integracion

| Test | Cambio |
|------|--------|
| `CreateBookUseCase.integration.test.ts` | Sin cambios (no toca HTTP) |

### 8.3 Tests E2E

| Test | Cambio |
|------|--------|
| `createBook.e2e.test.ts` | Actualizar assertions para `{ success, data, error }` |

---

## 9. Definicion de Hecho (DoD)

- [ ] Codigo limpio (Lint/Typecheck OK)
- [ ] Esquemas comunes creados (`common.schemas.ts`)
- [ ] `HttpErrorMapper` refactorizado con nueva estructura
- [ ] `BooksController` envuelve respuestas en estructura estandar
- [ ] Documentacion OpenAPI actualizada
- [ ] Tests unitarios actualizados y pasando
- [ ] Tests E2E actualizados y pasando
- [ ] 0 lint errors, 0 type errors, all tests green, build success

---

## 10. Referencias

- [03-hu-001-create-book.md](./03-hu-001-create-book.md) - Historia de creacion de libros
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0) - Estandar de documentacion API
