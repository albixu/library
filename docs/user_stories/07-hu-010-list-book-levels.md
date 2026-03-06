# HU-010: Listar Niveles de Libros

## 1. Descripción de la Historia de Usuario

**Como** usuario de la biblioteca digital  
**Quiero** obtener una lista de los niveles de dificultad disponibles para libros  
**Para** poder filtrar y categorizar libros según su nivel de dificultad

### Criterios de Aceptación

1. **AC1**: El endpoint `GET /api/book-levels` devuelve todos los niveles ordenados alfabéticamente (A-Z)
2. **AC2**: El endpoint acepta un parámetro opcional `?type=<typeName>` para filtrar niveles por tipo de libro
3. **AC3**: El filtro por tipo es case-insensitive (`?type=TECHNICAL` equivale a `?type=technical`)
4. **AC4**: Si el tipo especificado no existe, se devuelve un array vacío con status 200
5. **AC5**: Cada nivel en la respuesta incluye solo `id` y `name`
6. **AC6**: La respuesta sigue el formato estandarizado: `{ success, data, error }`
7. **AC7**: El endpoint `/api/categories` se renombra a `/api/book-categories` para mantener consistencia

### Notas Técnicas

- Los niveles se almacenan en la tabla `levels`
- La relación tipo-nivel es N:N a través de la tabla `type_levels`
- Cuando se filtra por tipo, solo se devuelven niveles asociados en `type_levels`

---

## 2. Diseño Técnico

### 2.1 Endpoint

```
GET /api/book-levels
GET /api/book-levels?type=technical
```

### 2.2 Query Parameters

| Parámetro | Tipo   | Requerido | Descripción                                    |
|-----------|--------|-----------|------------------------------------------------|
| type      | string | No        | Nombre del tipo para filtrar (case-insensitive)|

### 2.3 Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Advanced"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Beginner"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Intermediate"
    }
  ],
  "error": null
}
```

#### Empty Result (200 OK)

Cuando no hay niveles o el tipo no existe:

```json
{
  "success": true,
  "data": [],
  "error": null
}
```

#### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Database connection failed"
  }
}
```

### 2.4 Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP Layer                                   │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐ │
│  │ book-levels     │───▶│ BookLevels       │───▶│ Zod Schemas    │ │
│  │ .routes.ts      │    │ Controller.ts    │    │                │ │
│  └─────────────────┘    └──────────────────┘    └────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  ListBookLevelsUseCase                       │   │
│  │  - execute(typeName?: string): Promise<BookLevelListItem[]>  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Domain Layer (Ports)                           │
│  ┌─────────────────────┐         ┌─────────────────────┐           │
│  │   LevelRepository   │         │   TypeRepository    │           │
│  │ + findAllSorted()   │         │ + findByName()      │           │
│  │ + findByTypeId      │         └─────────────────────┘           │
│  │   Sorted()          │                                            │
│  └─────────────────────┘                                            │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              PostgresLevelRepository                         │   │
│  │  - Implements findAllSorted() and findByTypeIdSorted()       │   │
│  │  - Uses type_levels junction table for filtering             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Plan de Implementación

### Task 0: Renombrar endpoint de categories
**Descripción**: Renombrar `/api/categories` a `/api/book-categories`  
**Archivos a modificar**:
- `apps/api/src/infrastructure/driver/http/routes/categories.routes.ts`
- `apps/api/src/infrastructure/driver/http/server.ts`
- `apps/api/tests/e2e/http/listCategories.e2e.test.ts`
- `docs/api/openapi.yaml`

**Tests**: Actualizar tests E2E existentes

---

### Task 1: Extender LevelRepository Port
**Descripción**: Añadir métodos `findAllSorted()` y `findByTypeIdSorted(typeId)` al puerto  
**Archivo**: `apps/api/src/application/ports/LevelRepository.ts`

```typescript
export interface LevelRepository {
  // ... existing methods ...
  
  /**
   * Retrieves all levels sorted alphabetically by name (A-Z)
   */
  findAllSorted(): Promise<Level[]>;
  
  /**
   * Retrieves levels associated with a type, sorted alphabetically by name (A-Z)
   * Uses type_levels junction table
   */
  findByTypeIdSorted(typeId: string): Promise<Level[]>;
}
```

**Tests**: Actualizar tests unitarios del mock repository

---

### Task 2: Implementar métodos en PostgresLevelRepository
**Descripción**: Implementar los nuevos métodos usando Drizzle ORM  
**Archivo**: `apps/api/src/infrastructure/driven/persistence/PostgresLevelRepository.ts`

**Queries**:
```typescript
// findAllSorted
db.select().from(levels).orderBy(asc(levels.name));

// findByTypeIdSorted (using junction table)
db.select({ 
    id: levels.id, 
    name: levels.name,
    createdAt: levels.createdAt,
    updatedAt: levels.updatedAt
  })
  .from(levels)
  .innerJoin(typeLevels, eq(levels.id, typeLevels.levelId))
  .where(eq(typeLevels.typeId, typeId))
  .orderBy(asc(levels.name));
```

**Tests**: 8+ tests unitarios cubriendo:
- findAllSorted devuelve niveles ordenados
- findAllSorted devuelve array vacío si no hay niveles
- findByTypeIdSorted devuelve niveles del tipo
- findByTypeIdSorted devuelve array vacío si tipo no tiene niveles
- findByTypeIdSorted ordena alfabéticamente

---

### Task 3: Tests de integración para PostgresLevelRepository
**Descripción**: Tests de integración para los nuevos métodos  
**Archivo**: `apps/api/tests/integration/infrastructure/persistence/PostgresLevelRepository.integration.test.ts`

**Tests**: 6+ tests de integración

---

### Task 4: Crear ListBookLevelsUseCase
**Descripción**: Use case que orquesta la lógica de negocio  
**Archivo**: `apps/api/src/application/use-cases/ListBookLevelsUseCase.ts`

```typescript
export interface BookLevelListItem {
  id: string;
  name: string;
}

export class ListBookLevelsUseCase {
  constructor(
    private readonly levelRepository: LevelRepository,
    private readonly typeRepository: TypeRepository,
  ) {}

  async execute(typeName?: string): Promise<BookLevelListItem[]> {
    if (typeName) {
      const type = await this.typeRepository.findByName(typeName);
      if (!type) {
        return [];
      }
      const levels = await this.levelRepository.findByTypeIdSorted(type.id);
      return this.mapToDto(levels);
    }
    
    const levels = await this.levelRepository.findAllSorted();
    return this.mapToDto(levels);
  }

  private mapToDto(levels: Level[]): BookLevelListItem[] {
    return levels.map(level => ({
      id: level.id,
      name: level.name,
    }));
  }
}
```

**Tests**: 12+ tests unitarios

---

### Task 5: Crear schemas Zod para validación
**Descripción**: Schemas para query params y response  
**Archivo**: `apps/api/src/infrastructure/driver/http/schemas/book-level.schemas.ts`

```typescript
export const listBookLevelsQuerySchema = z.object({
  type: z.string().trim().optional(),
});

export const bookLevelListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const listBookLevelsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(bookLevelListItemSchema),
  error: z.null(),
});
```

**Tests**: Tests unitarios para schemas

---

### Task 6: Crear BookLevelsController
**Descripción**: Controller HTTP que maneja las requests  
**Archivo**: `apps/api/src/infrastructure/driver/http/controllers/BookLevelsController.ts`

```typescript
export class BookLevelsController {
  constructor(deps: BookLevelsControllerDeps) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    // 1. Parse query params
    // 2. Call use case
    // 3. Return standardized response
  }
}
```

**Tests**: 12+ tests unitarios

---

### Task 7: Crear rutas y registrar en servidor
**Descripción**: Definir rutas y registrar en Fastify  
**Archivos**:
- `apps/api/src/infrastructure/driver/http/routes/book-levels.routes.ts`
- `apps/api/src/infrastructure/driver/http/server.ts`
- `apps/api/src/server.ts`

---

### Task 8: Tests E2E
**Descripción**: Tests end-to-end del endpoint completo  
**Archivo**: `apps/api/tests/e2e/http/listBookLevels.e2e.test.ts`

**Tests**:
- GET /api/book-levels devuelve todos los niveles ordenados
- GET /api/book-levels?type=technical devuelve niveles del tipo
- GET /api/book-levels?type=TECHNICAL funciona (case-insensitive)
- GET /api/book-levels?type=nonexistent devuelve array vacío
- Respuesta tiene formato estandarizado
- Niveles ordenados alfabéticamente

---

### Task 9: Documentación OpenAPI
**Descripción**: Actualizar especificación OpenAPI  
**Archivo**: `docs/api/openapi.yaml`

**Cambios**:
- Renombrar `/categories` a `/book-categories`
- Añadir tag "Book Levels"
- Añadir endpoint `/book-levels`
- Añadir schemas `BookLevelListItem` y `BookLevelListResponse`

---

## 4. Modelo de Datos

### Tabla: levels

| Columna    | Tipo         | Nullable | Descripción                    |
|------------|--------------|----------|--------------------------------|
| id         | UUID         | No       | Primary key                    |
| name       | VARCHAR(100) | No       | Nombre único del nivel         |
| created_at | TIMESTAMPTZ  | No       | Fecha de creación              |
| updated_at | TIMESTAMPTZ  | No       | Fecha de última actualización  |

### Tabla: type_levels (junction)

| Columna    | Tipo        | Nullable | Descripción                    |
|------------|-------------|----------|--------------------------------|
| type_id    | UUID (FK)   | No       | Referencia a types.id          |
| level_id   | UUID (FK)   | No       | Referencia a levels.id         |
| created_at | TIMESTAMPTZ | No       | Fecha de creación              |

---

## 5. Consideraciones de Testing

### Tests Unitarios (~50 tests nuevos)
- LevelRepository mock updates
- PostgresLevelRepository (8+ tests)
- ListBookLevelsUseCase (12+ tests)
- BookLevelsController (12+ tests)
- Zod schemas

### Tests de Integración (~6 tests nuevos)
- PostgresLevelRepository con DB real

### Tests E2E (~10 tests nuevos)
- Endpoint completo con filtros

### Tests a Actualizar
- Tests E2E de categories (cambio de ruta)

---

## 6. Checklist de Definición de Hecho (DoD)

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Mínimo 80% de tests unitarios nuevos
- [ ] 100% de tests funcionales nuevos
- [ ] Documentación OpenAPI actualizada
- [ ] Commits con estándar Conventional Commits
- [ ] 0 lint errors, 0 type errors
- [ ] Todos los tests verdes
- [ ] Build exitoso

---

## 7. Dependencias

- HU-008: Relación Type-Level (completada)
- HU-009: Listar Categorías (completada - se renombra endpoint)

---

## 8. Estimación

**Complejidad**: Media  
**Tasks**: 10 (incluyendo Task 0 de renombrado)  
**Tests estimados**: ~66 nuevos + actualizaciones
