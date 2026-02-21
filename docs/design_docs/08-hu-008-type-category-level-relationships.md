# Design Doc: HU-008 - Establecer Dependencia de Category y Level con Type

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-008 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-21 |
| **Prioridad** | Alta |
| **Estimacion** | A definir |
| **Dependencias** | HU-001 (Create Book), HU-005 (List Book Types) |

---

## 1. Historia de Usuario

**Como** administrador del sistema de biblioteca,  
**Quiero** que las categorias y niveles esten relacionados con los tipos de libro,  
**Para** garantizar la consistencia de datos y que cada tipo de libro tenga sus propias categorias y niveles validos.

---

## 2. Contexto y Motivacion

Actualmente, las propiedades `type`, `category` y `level` de un libro son independientes entre si. Esto permite combinaciones inconsistentes (ej: una categoria de novela asignada a un libro tecnico).

Este cambio establece que:
- **Type -> Category**: Relacion 1:N. Cada categoria pertenece a exactamente un tipo.
- **Type -> Level**: Relacion N:N. Un tipo puede tener multiples niveles disponibles, y un nivel puede estar disponible para multiples tipos.

### Beneficios
1. **Consistencia de datos**: Imposible asignar categorias o niveles invalidos a un tipo
2. **Validacion automatica**: El sistema valida las relaciones al crear libros
3. **Escalabilidad**: Facilita agregar nuevos tipos con sus propias categorias y niveles
4. **Flexibilidad**: Los levels se crean dinamicamente segun los datos

---

## 3. Alcance

### 3.1 Incluido
- Modificar estructura de base de datos (`init-db.sql` y schema Drizzle)
- Crear entidad `Level` como entidad persistida (reemplaza el value object `BookLevel`)
- Modificar entidad `Category` para incluir referencia a `Type`
- Modificar entidad `Type` para conocer sus levels asociados
- Crear `LevelRepository` con su implementacion PostgreSQL
- Crear tabla intermedia `type_levels` para la relacion N:N
- Modificar `CategoryRepository` para gestionar la relacion con Type
- Modificar entidad `Book` para que `level` sea UUID en lugar de enum
- Actualizar `CreateBookUseCase` con validaciones de consistencia Type-Category y Type-Level
- Actualizar script de seed para crear relaciones automaticamente
- Actualizar todos los tests afectados manteniendo cobertura completa
- Actualizar documentacion en `design_docs` (excepto HUs y books.json)

### 3.2 Excluido
- Nuevos endpoints para listar categories o levels (futuro)
- Modificaciones al fichero `books.json` (sera regenerado)
- Endpoints `GET /types/:id/categories` o `GET /types/:id/levels` (futuro)

---

## 4. Modelo de Datos

### 4.1 Diagrama de Relaciones

```
types (1) ──────< categories (N)
   │
   └──< type_levels >──┘
                       │
                    levels (N)

books ──> types (FK)
books ──> categories (FK)
books ──> levels (FK, nullable)
```

### 4.2 Tabla levels (NUEVA)

```sql
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 4.3 Tabla type_levels (NUEVA)

```sql
CREATE TABLE type_levels (
  type_id UUID NOT NULL REFERENCES types(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  PRIMARY KEY (type_id, level_id)
);
```

### 4.4 Modificacion tabla categories

```sql
ALTER TABLE categories
ADD COLUMN type_id UUID NOT NULL REFERENCES types(id) ON DELETE RESTRICT;
```

### 4.5 Modificacion tabla books

```sql
-- Cambiar level de ENUM a FK
ALTER TABLE books
DROP COLUMN level,
ADD COLUMN level_id UUID REFERENCES levels(id) ON DELETE SET NULL;
```

---

## 5. Especificacion de Entidades

### 5.1 Entidad Level (NUEVA)

```typescript
interface LevelProps {
  id: string;      // UUID
  name: string;    // Nombre del nivel (ej: "beginner", "intermediate", "advanced")
}

class Level {
  private constructor(props: LevelProps) { ... }
  
  static create(props: { name: string }): Level;
  static fromPersistence(props: LevelProps): Level;
  
  get id(): string;
  get name(): string;
}
```

**Validaciones:**
- `name`: requerido, no vacio, maximo 100 caracteres

### 5.2 Entidad Category (MODIFICADA)

```typescript
interface CategoryProps {
  id: string;      // UUID
  name: string;    // Nombre de la categoria
  typeId: string;  // UUID del Type al que pertenece (NUEVO)
}

class Category {
  static create(props: { name: string; typeId: string }): Category;
  static fromPersistence(props: CategoryProps): Category;
  
  get typeId(): string;  // NUEVO
}
```

### 5.3 Entidad Type (MODIFICADA)

```typescript
interface BookTypeProps {
  id: string;
  name: string;
  levelIds: readonly string[];  // UUIDs de levels asociados (NUEVO)
}

class BookType {
  static create(props: { name: string; levelIds?: string[] }): BookType;
  static fromPersistence(props: BookTypeProps): BookType;
  
  get levelIds(): readonly string[];  // NUEVO
}
```

### 5.4 Entidad Book (MODIFICADA)

```typescript
interface BookProps {
  // ... otros campos
  level: string | null;  // Cambia de BookLevel enum a UUID string
}
```

---

## 6. Especificacion de Puertos

### 6.1 LevelRepository (NUEVO)

```typescript
interface LevelRepository {
  findById(id: string): Promise<Level | null>;
  findByName(name: string): Promise<Level | null>;
  save(level: Level): Promise<void>;
  existsForType(levelId: string, typeId: string): Promise<boolean>;
  addToType(levelId: string, typeId: string): Promise<void>;
}
```

### 6.2 CategoryRepository (MODIFICADO)

```typescript
interface CategoryRepository {
  // ... metodos existentes
  findByNameAndTypeId(name: string, typeId: string): Promise<Category | null>;
}
```

### 6.3 TypeRepository (MODIFICADO)

Los metodos existentes retornaran `levelIds` como parte de la entidad `BookType`.

---

## 7. Errores de Dominio

### 7.1 CategoryTypeMismatchError (NUEVO)

```typescript
class CategoryTypeMismatchError extends DomainError {
  constructor(categoryName: string, actualTypeName: string, expectedTypeName: string) {
    super(`Category '${categoryName}' belongs to type '${actualTypeName}', not '${expectedTypeName}'`);
  }
}
```

### 7.2 LevelTypeMismatchError (NUEVO)

```typescript
class LevelTypeMismatchError extends DomainError {
  constructor(levelName: string, typeName: string) {
    super(`Level '${levelName}' is not available for type '${typeName}'`);
  }
}
```

---

## 8. Logica de Negocio

### 8.1 Validacion en CreateBookUseCase

```typescript
// Pseudocodigo
async execute(input: CreateBookInput): Promise<Book> {
  const type = await typeRepo.findByName(input.typeName);
  
  // Validar/Crear Category
  let category = await categoryRepo.findByName(input.categoryName);
  if (category) {
    if (category.typeId !== type.id) {
      throw new CategoryTypeMismatchError(
        category.name, 
        await getTypeName(category.typeId), 
        type.name
      );
    }
  } else {
    category = Category.create({ name: input.categoryName, typeId: type.id });
    await categoryRepo.save(category);
  }
  
  // Validar/Crear Level (si se proporciona)
  let levelId = null;
  if (input.levelName) {
    let level = await levelRepo.findByName(input.levelName);
    if (level) {
      const isValidForType = await levelRepo.existsForType(level.id, type.id);
      if (!isValidForType) {
        throw new LevelTypeMismatchError(level.name, type.name);
      }
      levelId = level.id;
    } else {
      level = Level.create({ name: input.levelName });
      await levelRepo.save(level);
      await levelRepo.addToType(level.id, type.id);
      levelId = level.id;
    }
  }
  
  // Crear libro con levelId
  const book = Book.create({ ...input, level: levelId });
  await bookRepo.save(book);
  return book;
}
```

### 8.2 Script de Seed - Orden de Creacion

1. **Types**: Crear todos los tipos de libro
2. **Levels**: Crear levels unicos extraidos de los datos
3. **Type-Levels**: Establecer relaciones entre types y levels
4. **Categories**: Crear categories con su `typeId` correspondiente
5. **Authors**: Crear autores (sin cambios)
6. **Books**: Crear libros con referencias correctas

---

## 9. Criterios de Aceptacion

### AC-1: Estructura de Base de Datos
- [ ] La tabla `categories` tiene FK `type_id` NOT NULL referenciando `types`
- [ ] Existe tabla `levels` con campos `id` (UUID PK) y `name` (VARCHAR UNIQUE NOT NULL)
- [ ] Existe tabla intermedia `type_levels` con FKs a `types` y `levels` (PK compuesta)
- [ ] La tabla `books` referencia `levels.id` en lugar de usar enum
- [ ] Las constraints de integridad referencial estan correctamente definidas
- [ ] El schema Drizzle refleja estos cambios

### AC-2: Entidad Level
- [ ] `Level` es una entidad inmutable con `id` (UUID) y `name` (string)
- [ ] Tiene factory methods `create()` y `fromPersistence()`
- [ ] Validaciones: name requerido, no vacio, longitud maxima razonable
- [ ] Tests unitarios cubren todos los casos

### AC-3: Entidad Category Modificada
- [ ] `Category` incluye propiedad `typeId` (UUID del Type al que pertenece)
- [ ] Factory methods actualizados para requerir `typeId`
- [ ] Tests unitarios actualizados

### AC-4: Entidad Type Modificada
- [ ] `Type` conoce sus `levelIds` asociados (array de UUIDs)
- [ ] Factory methods actualizados
- [ ] Tests unitarios actualizados

### AC-5: Entidad Book Modificada
- [ ] `Book.level` pasa de ser enum `BookLevel` a `string | null` (UUID)
- [ ] Factory methods actualizados
- [ ] Tests unitarios actualizados

### AC-6: LevelRepository
- [ ] Puerto `LevelRepository` definido con operaciones: `findById`, `findByName`, `save`, `existsForType`, `addToType`
- [ ] Implementacion `PostgresLevelRepository` funcional
- [ ] Tests unitarios e integracion completos

### AC-7: Repositorios Actualizados
- [ ] `CategoryRepository` incluye `typeId` en save y busquedas
- [ ] `TypeRepository` carga los `levelIds` asociados
- [ ] Mappers actualizados para las nuevas relaciones
- [ ] Tests unitarios e integracion actualizados

### AC-8: Validacion en CreateBookUseCase
- [ ] Si la categoria existe, se valida que pertenezca al type indicado
- [ ] Si la categoria no existe, se crea automaticamente asociada al type
- [ ] Si el level existe, se valida que este asociado al type indicado
- [ ] Si el level no existe, se crea automaticamente y se asocia al type
- [ ] Errores especificos: `CategoryTypeMismatchError`, `LevelTypeMismatchError`
- [ ] Tests unitarios cubren todos los escenarios

### AC-9: Script de Seed Actualizado
- [ ] Orden de creacion: Types -> Levels -> Type-Levels -> Categories
- [ ] Levels se crean automaticamente al procesar los datos
- [ ] Categories se crean con su `typeId` correspondiente
- [ ] Relaciones Type-Level se establecen correctamente
- [ ] Tests del script actualizados

### AC-10: Documentacion
- [ ] `01-project-overview.md` actualizado si aplica
- [ ] `02-project-structure.md` actualizado con nuevas entidades/repositorios
- [ ] Otros design_docs actualizados segun cambios

### AC-11: Cobertura de Tests
- [ ] Todos los tests existentes pasan (actualizados segun cambios)
- [ ] Cobertura minima 80% en codigo nuevo
- [ ] 0 errores de lint, 0 errores de tipos, build exitoso

---

## 10. Tareas Tecnicas

### Task 1: Actualizar Estructura de Base de Datos
**Descripcion:** Modificar `docs/db/init-db.sql` con las nuevas tablas y relaciones.
**Cambios:**
- Crear tabla `levels` (id UUID PK, name VARCHAR UNIQUE NOT NULL)
- Crear tabla `type_levels` (type_id, level_id, PK compuesta, FKs)
- Anadir columna `type_id` a tabla `categories` (FK NOT NULL)
- Modificar columna `level` en `books` para ser FK a `levels.id` (nullable)
- Eliminar tipo ENUM `book_level` si existe

**Entregables:** `init-db.sql` actualizado

---

### Task 2: Actualizar Schema Drizzle
**Descripcion:** Reflejar los cambios de BD en el schema de Drizzle ORM.
**Cambios:**
- Definir tabla `levels` en schema
- Definir tabla `type_levels` con relaciones
- Anadir relacion `typeId` en `categories`
- Modificar `books.level` para ser referencia a `levels`
- Definir relaciones Drizzle correspondientes

**Dependencias:** Task 1
**Entregables:** `schema.ts` actualizado, migracion generada

---

### Task 3: Crear Entidad Level - Dominio
**Descripcion:** Crear la entidad Level en la capa de dominio.
**Cambios:**
- Crear `src/domain/entities/Level.ts`
- Propiedades: `id` (UUID), `name` (string)
- Factory methods: `create()`, `fromPersistence()`
- Validaciones: name requerido, no vacio, max 100 caracteres
- Inmutabilidad con `Object.freeze()`
- Exportar desde `src/domain/entities/index.ts`

**Entregables:** `Level.ts`, actualizacion de `index.ts`

---

### Task 4: Tests Unitarios Entidad Level
**Descripcion:** Crear tests unitarios completos para la entidad Level.
**Casos a cubrir:**
- Creacion exitosa con `create()`
- Creacion exitosa con `fromPersistence()`
- Error si name esta vacio
- Error si name es solo espacios
- Error si name excede longitud maxima
- Inmutabilidad del objeto

**Dependencias:** Task 3
**Entregables:** `tests/unit/domain/entities/Level.test.ts`

---

### Task 5: Modificar Entidad Category - Anadir typeId
**Descripcion:** Actualizar Category para incluir la relacion con Type.
**Cambios:**
- Anadir propiedad `typeId: string` (UUID)
- Actualizar `create()` para requerir `typeId`
- Actualizar `fromPersistence()` para incluir `typeId`
- Validar que `typeId` sea UUID valido

**Entregables:** `Category.ts` actualizado

---

### Task 6: Actualizar Tests Unitarios Entidad Category
**Descripcion:** Actualizar tests para cubrir la nueva propiedad typeId.
**Casos a cubrir:**
- Creacion exitosa con typeId valido
- Error si typeId esta ausente
- Error si typeId no es UUID valido
- Todos los casos existentes siguen pasando

**Dependencias:** Task 5
**Entregables:** `Category.test.ts` actualizado

---

### Task 7: Modificar Entidad Type - Anadir levelIds
**Descripcion:** Actualizar Type para conocer sus levels asociados.
**Cambios:**
- Anadir propiedad `levelIds: readonly string[]` (array de UUIDs)
- Actualizar `create()` para aceptar `levelIds` opcional (default: [])
- Actualizar `fromPersistence()` para incluir `levelIds`
- Validar que cada levelId sea UUID valido

**Entregables:** `BookType.ts` actualizado

---

### Task 8: Actualizar Tests Unitarios Entidad Type
**Descripcion:** Actualizar tests para cubrir la nueva propiedad levelIds.
**Casos a cubrir:**
- Creacion exitosa con levelIds vacio
- Creacion exitosa con levelIds con valores
- Error si algun levelId no es UUID valido
- Inmutabilidad del array levelIds
- Todos los casos existentes siguen pasando

**Dependencias:** Task 7
**Entregables:** `BookType.test.ts` actualizado

---

### Task 9: Eliminar Value Object BookLevel
**Descripcion:** Eliminar el value object BookLevel ya que Level sera una entidad.
**Cambios:**
- Eliminar `src/domain/value-objects/BookLevel.ts`
- Eliminar exportacion de `src/domain/value-objects/index.ts`
- Eliminar `tests/unit/domain/value-objects/BookLevel.test.ts`

**Entregables:** Archivos eliminados, exports actualizados

---

### Task 10: Modificar Entidad Book - Level como UUID
**Descripcion:** Cambiar Book.level de enum a UUID referenciando Level.
**Cambios:**
- Cambiar tipo de `level` de `BookLevel | null` a `string | null`
- Actualizar validacion: si level presente, debe ser UUID valido
- Actualizar `create()` y `fromPersistence()`

**Dependencias:** Task 9
**Entregables:** `Book.ts` actualizado

---

### Task 11: Actualizar Tests Unitarios Entidad Book
**Descripcion:** Actualizar tests para el nuevo tipo de level.
**Casos a cubrir:**
- Creacion exitosa con level null
- Creacion exitosa con level UUID valido
- Error si level no es UUID valido (cuando presente)
- Todos los casos existentes siguen pasando

**Dependencias:** Task 10
**Entregables:** `Book.test.ts` actualizado

---

### Task 12: Crear Puerto LevelRepository
**Descripcion:** Definir la interfaz del repositorio de Level.
**Cambios:**
- Crear `src/application/ports/LevelRepository.ts`
- Metodos: `findById(id)`, `findByName(name)`, `save(level)`, `existsForType(levelId, typeId)`, `addToType(levelId, typeId)`
- Exportar desde `src/application/ports/index.ts`

**Entregables:** `LevelRepository.ts`, actualizacion de `index.ts`

---

### Task 13: Crear Errores de Dominio para Validaciones
**Descripcion:** Crear errores especificos para las validaciones de consistencia.
**Cambios:**
- Anadir `CategoryTypeMismatchError` en DomainErrors
- Anadir `LevelTypeMismatchError` en DomainErrors
- Mensajes descriptivos con nombres de entidades involucradas

**Entregables:** `DomainErrors.ts` actualizado

---

### Task 14: Crear LevelMapper
**Descripcion:** Crear mapper para transformar entre Level de dominio y persistencia.
**Cambios:**
- Crear `src/infrastructure/driven/persistence/mappers/LevelMapper.ts`
- Metodos: `toDomain(row)`, `toPersistence(level)`
- Exportar desde `index.ts`

**Dependencias:** Task 3, Task 2
**Entregables:** `LevelMapper.ts`, actualizacion de `index.ts`

---

### Task 15: Implementar PostgresLevelRepository
**Descripcion:** Implementar el repositorio de Level con PostgreSQL.
**Cambios:**
- Crear `src/infrastructure/driven/persistence/PostgresLevelRepository.ts`
- Implementar todos los metodos del puerto
- Usar Drizzle ORM para queries
- Query `existsForType` consulta tabla `type_levels`

**Dependencias:** Task 12, Task 14, Task 2
**Entregables:** `PostgresLevelRepository.ts`, actualizacion de `index.ts`

---

### Task 16: Tests Unitarios PostgresLevelRepository
**Descripcion:** Crear tests unitarios con mocks para el repositorio.
**Casos a cubrir:**
- `findById` retorna Level cuando existe
- `findById` retorna null cuando no existe
- `findByName` retorna Level cuando existe
- `findByName` retorna null cuando no existe
- `save` persiste correctamente
- `existsForType` retorna true/false segun corresponda
- `addToType` inserta relacion correctamente

**Dependencias:** Task 15
**Entregables:** `PostgresLevelRepository.test.ts`

---

### Task 17: Tests Integracion PostgresLevelRepository
**Descripcion:** Crear tests de integracion contra PostgreSQL real.
**Casos a cubrir:**
- CRUD completo de Level
- Verificacion de constraint UNIQUE en name
- `existsForType` con datos reales en type_levels
- `addToType` crea relacion en BD

**Dependencias:** Task 15, Task 2
**Entregables:** `PostgresLevelRepository.integration.test.ts`

---

### Task 18: Actualizar CategoryMapper
**Descripcion:** Anadir typeId al mapper de Category.
**Cambios:**
- Actualizar `toDomain()` para incluir `typeId`
- Actualizar `toPersistence()` para incluir `type_id`

**Dependencias:** Task 5, Task 2
**Entregables:** `CategoryMapper.ts` actualizado

---

### Task 19: Actualizar PostgresCategoryRepository
**Descripcion:** Actualizar repositorio para manejar la relacion con Type.
**Cambios:**
- `save()` incluye `type_id`
- Queries cargan `type_id`
- Anadir metodo `findByNameAndTypeId(name, typeId)` si necesario

**Dependencias:** Task 18
**Entregables:** `PostgresCategoryRepository.ts` actualizado

---

### Task 20: Actualizar Tests PostgresCategoryRepository
**Descripcion:** Actualizar tests unitarios e integracion del repositorio.
**Casos a cubrir:**
- Save con typeId
- Queries retornan typeId
- Constraint FK con types funciona

**Dependencias:** Task 19
**Entregables:** Tests actualizados

---

### Task 21: Actualizar TypeMapper
**Descripcion:** Anadir levelIds al mapper de Type.
**Cambios:**
- Actualizar `toDomain()` para incluir `levelIds`
- Query adicional o JOIN para obtener levels asociados

**Dependencias:** Task 7, Task 2
**Entregables:** `TypeMapper.ts` actualizado

---

### Task 22: Actualizar PostgresTypeRepository
**Descripcion:** Actualizar repositorio para cargar levels asociados.
**Cambios:**
- Queries cargan `levelIds` desde `type_levels`
- Metodo para anadir relacion type-level si necesario

**Dependencias:** Task 21
**Entregables:** `PostgresTypeRepository.ts` actualizado

---

### Task 23: Actualizar Tests PostgresTypeRepository
**Descripcion:** Actualizar tests unitarios e integracion del repositorio.
**Casos a cubrir:**
- findById retorna levelIds
- findByName retorna levelIds
- Relacion type_levels funciona correctamente

**Dependencias:** Task 22
**Entregables:** Tests actualizados

---

### Task 24: Actualizar BookMapper
**Descripcion:** Actualizar mapper para que level sea UUID.
**Cambios:**
- `toDomain()` mapea `level_id` a `level` (string | null)
- `toPersistence()` mapea `level` a `level_id`

**Dependencias:** Task 10, Task 2
**Entregables:** `BookMapper.ts` actualizado

---

### Task 25: Actualizar PostgresBookRepository
**Descripcion:** Actualizar repositorio para el nuevo tipo de level.
**Cambios:**
- Queries usan `level_id` como FK
- Save persiste UUID de level

**Dependencias:** Task 24
**Entregables:** `PostgresBookRepository.ts` actualizado

---

### Task 26: Actualizar Tests PostgresBookRepository
**Descripcion:** Actualizar tests unitarios e integracion del repositorio.
**Casos a cubrir:**
- Save con level UUID
- Save con level null
- Queries retornan level como UUID

**Dependencias:** Task 25
**Entregables:** Tests actualizados

---

### Task 27: Actualizar CreateBookUseCase - Validaciones
**Descripcion:** Anadir validaciones de consistencia Type-Category y Type-Level.
**Cambios:**
- Inyectar `LevelRepository` en constructor
- Si category existe: validar que `category.typeId === book.typeId`
- Si category no existe: crear con `typeId` del book
- Si level existe: validar que este asociado al type (`existsForType`)
- Si level no existe: crear level y asociar al type
- Lanzar `CategoryTypeMismatchError` o `LevelTypeMismatchError` segun corresponda

**Dependencias:** Task 13, Task 15, Task 19
**Entregables:** `CreateBookUseCase.ts` actualizado

---

### Task 28: Actualizar Tests Unitarios CreateBookUseCase
**Descripcion:** Anadir tests para las nuevas validaciones.
**Casos a cubrir:**
- Category existe y pertenece al type correcto -> OK
- Category existe pero pertenece a otro type -> Error
- Category no existe -> se crea con typeId
- Level existe y esta asociado al type -> OK
- Level existe pero no esta asociado al type -> Error
- Level no existe -> se crea y asocia al type
- Combinaciones de los casos anteriores

**Dependencias:** Task 27
**Entregables:** `CreateBookUseCase.test.ts` actualizado

---

### Task 29: Actualizar Tests Integracion CreateBookUseCase
**Descripcion:** Tests de integracion con BD real.
**Casos a cubrir:**
- Flujo completo con category y level nuevos
- Flujo con category existente valido
- Flujo con category existente invalido
- Flujo con level existente valido
- Flujo con level existente invalido

**Dependencias:** Task 27
**Entregables:** `CreateBookUseCase.integration.test.ts` actualizado

---

### Task 30: Actualizar BooksController y Schemas
**Descripcion:** Ajustar controller y schemas Zod si es necesario.
**Cambios:**
- Schema de request: level sigue siendo string (nombre)
- Mapear nuevos errores de dominio a respuestas HTTP 422

**Dependencias:** Task 27
**Entregables:** `BooksController.ts`, `book.schemas.ts` actualizados si necesario

---

### Task 31: Actualizar Tests BooksController
**Descripcion:** Actualizar tests del controller.
**Casos a cubrir:**
- Respuesta correcta para errores de mismatch
- Flujos existentes siguen funcionando

**Dependencias:** Task 30
**Entregables:** `BooksController.test.ts` actualizado

---

### Task 32: Actualizar HttpErrorMapper
**Descripcion:** Mapear nuevos errores de dominio a HTTP.
**Cambios:**
- `CategoryTypeMismatchError` -> 422 Unprocessable Entity
- `LevelTypeMismatchError` -> 422 Unprocessable Entity

**Dependencias:** Task 13
**Entregables:** `HttpErrorMapper.ts` actualizado

---

### Task 33: Actualizar Tests HttpErrorMapper
**Descripcion:** Tests para los nuevos mappings de error.

**Dependencias:** Task 32
**Entregables:** `HttpErrorMapper.test.ts` actualizado

---

### Task 34: Actualizar Script seed-database
**Descripcion:** Modificar script para crear relaciones correctamente.
**Cambios:**
- Orden: Types -> Levels -> Type-Levels -> Categories -> Books
- Extraer levels unicos de los datos
- Crear levels y asociarlos a types
- Crear categories con typeId
- Usar LevelRepository para persistir levels

**Dependencias:** Task 15, Task 19
**Entregables:** `seed-database.ts` actualizado

---

### Task 35: Actualizar Tests Script seed-database
**Descripcion:** Tests unitarios del script actualizado.
**Casos a cubrir:**
- Levels se crean correctamente
- Relaciones type-level se establecen
- Categories se crean con typeId
- Orden de ejecucion es correcto

**Dependencias:** Task 34
**Entregables:** `seed-database.test.ts` actualizado

---

### Task 36: Actualizar Tests E2E
**Descripcion:** Ajustar tests end-to-end para los cambios.
**Cambios:**
- Fixtures con estructura correcta
- Tests de createBook con validaciones

**Dependencias:** Task 30
**Entregables:** Tests E2E actualizados

---

### Task 37: Actualizar Documentacion design_docs
**Descripcion:** Actualizar documentos de diseno.
**Cambios:**
- `01-project-overview.md`: mencionar relaciones entre entidades
- `02-project-structure.md`: documentar Level entity, LevelRepository
- Otros docs afectados

**Entregables:** Documentacion actualizada

---

### Task 38: Verificacion Final y Limpieza
**Descripcion:** Verificacion completa del sistema.
**Checklist:**
- [ ] `npm run lint:fix` sin errores
- [ ] `npm run build` exitoso
- [ ] Todos los tests unitarios pasan
- [ ] Todos los tests integracion pasan
- [ ] Todos los tests E2E pasan
- [ ] Cobertura >= 80%
- [ ] No hay codigo muerto ni imports sin usar

**Entregables:** Sistema funcionando completamente

---

## 11. Testing

### 11.1 Tests Unitarios Nuevos

| Componente | Tests |
|------------|-------|
| `Level.test.ts` | Creacion, validaciones, inmutabilidad |
| `PostgresLevelRepository.test.ts` | CRUD con mocks |

### 11.2 Tests Unitarios Modificados

| Componente | Cambios |
|------------|---------|
| `Category.test.ts` | Casos con typeId |
| `BookType.test.ts` | Casos con levelIds |
| `Book.test.ts` | Level como UUID |
| `CreateBookUseCase.test.ts` | Validaciones mismatch |
| `PostgresCategoryRepository.test.ts` | typeId en operaciones |
| `PostgresTypeRepository.test.ts` | levelIds en respuestas |
| `PostgresBookRepository.test.ts` | level_id FK |

### 11.3 Tests de Integracion

| Componente | Tests |
|------------|-------|
| `PostgresLevelRepository.integration.test.ts` | CRUD real, constraints |
| `PostgresCategoryRepository.integration.test.ts` | FK con types |
| `PostgresTypeRepository.integration.test.ts` | Carga de levelIds |
| `CreateBookUseCase.integration.test.ts` | Flujos con BD real |

### 11.4 Tests E2E

| Test | Descripcion |
|------|-------------|
| `createBook.e2e.test.ts` | Validaciones category/level mismatch |

---

## 12. Respuestas HTTP

| Codigo | Situacion |
|--------|-----------|
| `201 Created` | Libro creado exitosamente |
| `400 Bad Request` | Datos de entrada invalidos |
| `422 Unprocessable Entity` | Category o Level no pertenece al Type |
| `500 Internal Server Error` | Error inesperado del servidor |

---

## 13. Consideraciones

### 13.1 Performance
- Las queries de validacion son simples lookups por FK
- La tabla `type_levels` es pequena (pocos types y levels)
- No se requiere cache adicional

### 13.2 Migracion de Datos
- Los datos existentes en BD deberan ser migrados
- El script de seed es la fuente de verdad para datos iniciales
- Se eliminara el enum `book_level` de PostgreSQL

### 13.3 Compatibilidad
- La API sigue recibiendo `level` como string (nombre)
- Internamente se convierte a UUID
- No hay breaking changes en el contrato de la API

---

## 14. Definicion de Hecho (DoD)

- [ ] Codigo limpio (Lint/Typecheck OK)
- [ ] Estructura de BD actualizada (init-db.sql, schema.ts)
- [ ] Entidad Level creada con tests
- [ ] Entidades Category, Type, Book modificadas con tests
- [ ] Value Object BookLevel eliminado
- [ ] LevelRepository (puerto + implementacion) con tests
- [ ] Repositorios Category, Type, Book actualizados con tests
- [ ] CreateBookUseCase con validaciones y tests
- [ ] Script seed-database actualizado con tests
- [ ] HttpErrorMapper actualizado con tests
- [ ] Tests E2E actualizados
- [ ] Documentacion design_docs actualizada
- [ ] 0 lint errors, 0 type errors, all tests green, build success
- [ ] Cobertura >= 80%

---

## 15. Referencias

- [03-hu-001-create-book.md](./03-hu-001-create-book.md) - Creacion de libros
- [07-hu-005-list-book-types.md](./07-hu-005-list-book-types.md) - Listado de tipos
- [02-project-structure.md](./02-project-structure.md) - Estructura del proyecto
