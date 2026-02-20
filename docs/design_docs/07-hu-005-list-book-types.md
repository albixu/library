# Design Doc: HU-005 - Listar Tipos de Libro

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-005 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-20 |
| **Prioridad** | Media |
| **Estimacion** | A definir |
| **Dependencias** | HU-004 (Estandarizar Respuestas API) |

---

## 1. Historia de Usuario

**Como** usuario del frontend,  
**Quiero** obtener un listado de todos los tipos de libro disponibles,  
**Para** poder seleccionar el tipo correcto al crear o filtrar libros en la interfaz.

---

## 2. Contexto

Los tipos de libro (`technical`, `novel`, `biography`, etc.) estan almacenados en la tabla `types` de la base de datos. Actualmente no existe un endpoint para consultarlos, lo que obliga al frontend a hardcodear los valores o no poder mostrar un selector dinamico.

Este endpoint es necesario para:
1. Poblar dropdowns/selects en formularios de creacion de libros
2. Mostrar filtros dinamicos en listados de libros (futuro)
3. Mantener sincronizados frontend y backend

---

## 3. Especificacion del Endpoint

### 3.1 Request

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/book-types` | Obtiene todos los tipos de libro |

**Parametros:** Ninguno

**Headers requeridos:** Ninguno

### 3.2 Response Exitosa (200 OK)

```json
{
  "success": true,
  "data": [
    { "id": "550e8400-e29b-41d4-a716-446655440001", "name": "biography" },
    { "id": "550e8400-e29b-41d4-a716-446655440002", "name": "novel" },
    { "id": "550e8400-e29b-41d4-a716-446655440003", "name": "technical" }
  ],
  "error": null
}
```

**Notas:**
- Los resultados vienen **ordenados alfabeticamente** por `name`
- Solo se devuelven los campos `id` y `name`
- Si no hay tipos en la base de datos, `data` sera un array vacio `[]`

### 3.3 Response con Lista Vacia (200 OK)

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

| Criterio | Descripcion |
|----------|-------------|
| **Endpoint accesible** | `GET /api/book-types` responde correctamente |
| **Estructura de respuesta** | Sigue el estandar definido en HU-004: `{ success, data, error }` |
| **Campos retornados** | Solo `id` y `name` por cada tipo |
| **Ordenamiento** | Resultados ordenados alfabeticamente por `name` (A-Z) |
| **Lista vacia** | Si no hay tipos, retorna `data: []` con status 200 |
| **Codigo HTTP** | Retorna 200 OK en exito, 500 en error interno |

---

## 5. Arquitectura

### 5.1 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GET /api/book-types                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BookTypesController                            │
│  - Recibe request                                                    │
│  - Llama al use case                                                 │
│  - Formatea respuesta con estructura estandar                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ListBookTypesUseCase                           │
│  - Obtiene tipos del repositorio                                     │
│  - Ordena alfabeticamente                                            │
│  - Retorna DTOs con id y name                                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       TypeRepository (Port)                          │
│  - findAllSorted(): Promise<BookType[]>                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PostgresTypeRepository (Adapter)                  │
│  - Consulta tabla 'types'                                            │
│  - Ordena por 'name' ASC                                             │
│  - Mapea a entidades de dominio                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Estructura de Archivos

```
apps/api-cli/src/
├── application/
│   ├── ports/
│   │   └── TypeRepository.ts          # MODIFICAR: Agregar findAllSorted()
│   └── use-cases/
│       └── ListBookTypesUseCase.ts    # NUEVO
├── infrastructure/
│   ├── driven/
│   │   └── persistence/
│   │       └── PostgresTypeRepository.ts  # MODIFICAR: Implementar findAllSorted()
│   └── driver/
│       └── http/
│           ├── controllers/
│           │   └── BookTypesController.ts # NUEVO
│           └── routes/
│               └── book-types.routes.ts   # NUEVO
```

---

## 6. Modelo de Datos

### 6.1 DTO de Respuesta

```typescript
/**
 * BookType item for list responses
 * Only includes fields needed by the frontend
 */
interface BookTypeListItem {
  id: string;
  name: string;
}
```

### 6.2 Tabla de Base de Datos (existente)

```sql
CREATE TABLE types (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## 7. Plan de Implementacion

### Tarea 1: Extender TypeRepository Port
- Agregar metodo `findAllSorted(): Promise<BookType[]>` al puerto
- Actualizar tests unitarios del puerto

### Tarea 2: Implementar findAllSorted en PostgresTypeRepository
- Implementar query con ORDER BY name ASC
- Agregar tests unitarios
- Agregar tests de integracion

### Tarea 3: Crear ListBookTypesUseCase
- Crear use case que llama a `findAllSorted()`
- Mapear entidades a DTOs (solo id y name)
- Agregar tests unitarios

### Tarea 4: Crear BookTypesController
- Crear controlador con metodo `list()`
- Usar estructura de respuesta estandar de HU-004
- Agregar tests unitarios

### Tarea 5: Crear rutas de book-types
- Crear `book-types.routes.ts`
- Registrar en el servidor Fastify
- Agregar tests E2E

### Tarea 6: Actualizar documentacion OpenAPI
- Agregar endpoint `GET /api/book-types`
- Documentar esquemas de respuesta
- Agregar ejemplos

---

## 8. Testing

### 8.1 Tests Unitarios

| Componente | Tests |
|------------|-------|
| `PostgresTypeRepository.test.ts` | `findAllSorted()` retorna tipos ordenados |
| `ListBookTypesUseCase.test.ts` | Retorna DTOs correctos, maneja lista vacia |
| `BookTypesController.test.ts` | Estructura de respuesta correcta |

### 8.2 Tests de Integracion

| Componente | Tests |
|------------|-------|
| `PostgresTypeRepository.integration.test.ts` | Query real a PostgreSQL con ordenamiento |

### 8.3 Tests E2E

| Test | Descripcion |
|------|-------------|
| `listBookTypes.e2e.test.ts` | GET /api/book-types retorna lista ordenada |
| | Retorna estructura `{ success, data, error }` |
| | Retorna array vacio si no hay tipos |

---

## 9. Respuestas HTTP

| Codigo | Situacion |
|--------|-----------|
| `200 OK` | Lista obtenida exitosamente (incluso si esta vacia) |
| `500 Internal Server Error` | Error inesperado del servidor |

---

## 10. Consideraciones

### 10.1 Performance
- La tabla `types` es pequena (< 20 registros tipicamente)
- No se requiere paginacion ni cache
- El indice en `name` ya existe para otras queries

### 10.2 Seguridad
- Endpoint de solo lectura
- No expone informacion sensible
- No requiere autenticacion (sistema de usuario unico)

### 10.3 Escalabilidad
- Si en el futuro se necesitan mas campos, se puede extender el DTO
- El patron establecido sirve para futuros endpoints de listado

---

## 11. Definicion de Hecho (DoD)

- [ ] Codigo limpio (Lint/Typecheck OK)
- [ ] Puerto `TypeRepository` extendido con `findAllSorted()`
- [ ] `PostgresTypeRepository` implementa `findAllSorted()`
- [ ] `ListBookTypesUseCase` creado con tests
- [ ] `BookTypesController` creado con tests
- [ ] Rutas registradas en servidor Fastify
- [ ] Documentacion OpenAPI actualizada
- [ ] Tests unitarios pasando (minimo 80% cobertura)
- [ ] Tests de integracion pasando
- [ ] Tests E2E pasando
- [ ] 0 lint errors, 0 type errors, all tests green, build success

---

## 12. Referencias

- [06-hu-004-standardize-api-responses.md](./06-hu-004-standardize-api-responses.md) - Estructura de respuestas API
- [03-hu-001-create-book.md](./03-hu-001-create-book.md) - Uso de tipos en creacion de libros
- [TypeRepository.ts](../../apps/api-cli/src/application/ports/TypeRepository.ts) - Puerto actual
