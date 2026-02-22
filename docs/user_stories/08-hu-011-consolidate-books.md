# HU-011: Consolidar Libros desde Archivos JSON

## 1. Descripción de la Historia de Usuario

**Como** administrador del sistema  
**Quiero** regenerar el archivo `books.json` consolidando todos los libros de los archivos JSON originales  
**Para** tener un único archivo limpio, sin duplicados y excluyendo libros ya existentes en base de datos

### Criterios de Aceptación

1. **AC1**: El script elimina el archivo `docs/db/books.json` existente antes de generar uno nuevo
2. **AC2**: El script lee todos los archivos `db_libros_*.json` del directorio `original_data/`
3. **AC3**: El script deduplica libros usando el campo `id` como identificador único
4. **AC4**: El script excluye libros cuyo `id` ya existe como `isbn` en la base de datos
5. **AC5**: Cada libro en el archivo final incluye `type: "technical"` y `format: "epub"` (sobrescribiendo si existen)
6. **AC6**: Se mantienen todas las propiedades originales de cada libro (no se elimina ninguna)
7. **AC7**: El archivo `books.json` resultante es un array plano de objetos `[{...}, {...}]`
8. **AC8**: El script es idempotente: puede ejecutarse múltiples veces con resultados consistentes
9. **AC9**: El script `seed-database.ts` valida que no exista un libro con el mismo ISBN antes de crearlo
10. **AC10**: El script debe ejecutarse con la base de datos levantada (requiere conexión a PostgreSQL)

### Notas Técnicas

- El campo `id` en los archivos JSON originales corresponde al campo `isbn` en la base de datos
- El script actual (`consolidate-books.ts`) ya existe pero necesita modificaciones:
  - Cambiar directorio fuente de `apps/api/data/source/` a `original_data/`
  - Añadir conexión a BD para excluir libros existentes
  - Mantener todas las propiedades originales (no transformar estructura)
  - Eliminar el archivo existente antes de generar uno nuevo
- El script `seed-database.ts` ya tiene validación de ISBN duplicado implementada

---

## 2. Diseño Técnico

### 2.1 Flujo del Script `consolidate-books.ts`

```
┌─────────────────────────────────────────────────────────────────────┐
│                         1. INICIALIZACIÓN                           │
│  - Cargar configuración de entorno                                  │
│  - Conectar a base de datos PostgreSQL                              │
│  - Eliminar docs/db/books.json si existe                            │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      2. OBTENER ISBNs EXISTENTES                    │
│  - Consultar tabla books                                            │
│  - Obtener Set<string> con todos los ISBNs existentes               │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      3. LEER ARCHIVOS FUENTE                        │
│  - Listar archivos en original_data/                                │
│  - Filtrar por patrón db_libros_*.json                              │
│  - Ordenar alfabéticamente                                          │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      4. PROCESAR LIBROS                             │
│  Para cada archivo:                                                 │
│    Para cada libro:                                                 │
│      - Si id ya visto en archivos → SKIP (duplicado entre files)    │
│      - Si id existe en BD → SKIP (ya en base de datos)              │
│      - Añadir type: "technical" y format: "epub"                    │
│      - Mantener todas las propiedades originales                    │
│      - Añadir al array de salida                                    │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      5. GENERAR ARCHIVO                             │
│  - Crear directorio docs/db/ si no existe                           │
│  - Escribir books.json como array plano                             │
│  - Cerrar conexión a BD                                             │
│  - Mostrar estadísticas                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Libro Original (original_data/)

```typescript
interface SourceBook {
  readonly id: string;              // ISBN - identificador único
  readonly title: string;
  readonly authors: readonly string[];
  readonly description: string;
  readonly language?: string;
  readonly level?: string;
  readonly pages?: string;
  readonly publication_date?: string;
  readonly tags?: readonly string[];
  // ... cualquier otra propiedad
}
```

### 2.3 Estructura de Libro Consolidado (books.json)

```typescript
interface ConsolidatedBook {
  readonly id: string;              // Se mantiene igual
  readonly title: string;
  readonly authors: readonly string[];
  readonly description: string;
  readonly language?: string;       // Se mantiene
  readonly level?: string;          // Se mantiene
  readonly pages?: string;          // Se mantiene
  readonly publication_date?: string; // Se mantiene
  readonly tags?: readonly string[];  // Se mantiene
  readonly type: string;            // AÑADIDO: "technical"
  readonly format: string;          // AÑADIDO: "epub"
  // ... todas las propiedades originales se mantienen
}
```

### 2.4 Estadísticas de Salida

El script mostrará al finalizar:

```
--- Consolidation Complete ---
Files processed: 74
Total books read: 2500
Unique books (after file dedup): 2100
Excluded (already in DB): 150
Books written to file: 1950
Duplicates between files: 400
Output written to: docs/db/books.json
```

---

## 3. Plan de Implementación

### Task 1: Refactorizar consolidate-books.ts para conexión a BD
**Descripción**: Modificar el script para conectarse a PostgreSQL y obtener ISBNs existentes  
**Archivo**: `apps/api/scripts/consolidate-books.ts`

**Cambios**:
- Importar configuración de entorno y pool de conexión
- Añadir función `getExistingIsbns()` que consulta la BD
- Modificar `consolidateBooks()` para aceptar el Set de ISBNs existentes
- Añadir lógica para cerrar conexión al finalizar

```typescript
async function getExistingIsbns(db: DrizzleDB): Promise<Set<string>> {
  const result = await db
    .select({ isbn: books.isbn })
    .from(books)
    .where(isNotNull(books.isbn));
  
  return new Set(result.map(r => r.isbn).filter(Boolean));
}
```

**Tests**: 
- Actualizar tests unitarios existentes
- Añadir tests para exclusión por ISBN en BD

---

### Task 2: Cambiar directorio fuente a original_data/
**Descripción**: Modificar las rutas para leer de `original_data/` en vez de `apps/api/data/source/`  
**Archivo**: `apps/api/scripts/consolidate-books.ts`

**Cambios**:
- Actualizar `SOURCE_DIR` para apuntar a `original_data/` (relativo a la raíz del proyecto)
- Considerar que en Docker la estructura de directorios puede ser diferente
- El directorio `original_data/` está en la raíz del monorepo, no dentro de `apps/api/`

```typescript
// En Docker: /app/original_data
// En local: <project_root>/original_data
const PROJECT_ROOT = join(__dirname, '..', '..', '..'); // Subir desde scripts/ hasta raíz
const SOURCE_DIR = join(PROJECT_ROOT, 'original_data');
```

**Tests**: Actualizar tests que mockean el directorio fuente

---

### Task 3: Eliminar archivo existente antes de generar
**Descripción**: Añadir lógica para eliminar `docs/db/books.json` si existe  
**Archivo**: `apps/api/scripts/consolidate-books.ts`

**Cambios**:
```typescript
import { unlink } from 'node:fs/promises';

// Al inicio de consolidateBooks()
try {
  await unlink(OUTPUT_FILE);
  console.log(`Deleted existing file: ${OUTPUT_FILE}`);
} catch (error) {
  // File doesn't exist, which is fine
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}
```

**Tests**: Test que verifica eliminación de archivo existente

---

### Task 4: Mantener propiedades originales sin transformar
**Descripción**: Modificar la lógica para no transformar la estructura del libro  
**Archivo**: `apps/api/scripts/consolidate-books.ts`

**Cambios**:
- Eliminar o modificar función `transformBook()` para que solo añada `type` y `format`
- Usar spread operator para mantener todas las propiedades originales
- Sobrescribir `type` y `format` si ya existen

```typescript
function enrichBook(source: SourceBook): ConsolidatedBook {
  return {
    ...source,              // Mantener todas las propiedades originales
    type: 'technical',      // Sobrescribir/añadir
    format: 'epub',         // Sobrescribir/añadir
  };
}
```

**Tests**: 
- Test que verifica que propiedades como `language`, `level`, `pages` se mantienen
- Test que verifica que `type` y `format` se sobrescriben si existen

---

### Task 5: Actualizar validación de libros
**Descripción**: Modificar `isValidSourceBook()` para ser menos restrictiva  
**Archivo**: `apps/api/scripts/consolidate-books.ts`

**Cambios**:
- Solo validar campos mínimos requeridos (`id`, `title`, `authors`, `description`)
- No validar estructura de propiedades opcionales

```typescript
function isValidSourceBook(obj: unknown): obj is SourceBook {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const book = obj as Record<string, unknown>;
  
  return (
    typeof book.id === 'string' && book.id.length > 0 &&
    typeof book.title === 'string' && book.title.length > 0 &&
    Array.isArray(book.authors) && book.authors.length > 0 &&
    typeof book.description === 'string'
  );
}
```

**Tests**: Tests de validación actualizados

---

### Task 6: Actualizar interfaces y tipos
**Descripción**: Actualizar las interfaces TypeScript para reflejar los cambios  
**Archivo**: `apps/api/scripts/consolidate-books.ts`

**Cambios**:
```typescript
/**
 * Source book structure - allows any additional properties
 */
interface SourceBook {
  readonly id: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly description: string;
  readonly [key: string]: unknown;  // Permitir propiedades adicionales
}

/**
 * Consolidated book - source book with type and format added
 */
interface ConsolidatedBook extends SourceBook {
  readonly type: string;
  readonly format: string;
}

/**
 * Consolidation statistics
 */
interface ConsolidationResult {
  readonly totalFiles: number;
  readonly totalBooksRead: number;
  readonly uniqueBooksAfterFileDedup: number;
  readonly excludedExistingInDb: number;
  readonly booksWritten: number;
  readonly duplicatesBetweenFiles: number;
  readonly outputPath: string;
}
```

**Tests**: Actualizar tests con nuevas estadísticas

---

### Task 7: Tests de integración para consolidate-books.ts
**Descripción**: Crear tests de integración que prueban el script con BD real  
**Archivo**: `apps/api/tests/integration/scripts/consolidate-books.integration.test.ts`

**Tests**:
- Script lee archivos de original_data correctamente
- Script excluye libros que ya existen en BD por ISBN
- Script deduplica entre archivos
- Script mantiene todas las propiedades originales
- Script añade type y format
- Script es idempotente (ejecutar 2 veces produce mismo resultado)
- Script elimina archivo existente antes de generar

---

### Task 8: Actualizar tests unitarios de consolidate-books.ts
**Descripción**: Actualizar tests unitarios existentes  
**Archivo**: `apps/api/tests/unit/scripts/consolidate-books.test.ts`

**Tests a actualizar/añadir**:
- `enrichBook()` mantiene propiedades originales
- `enrichBook()` añade type y format
- `enrichBook()` sobrescribe type y format existentes
- `isValidSourceBook()` acepta libros con propiedades extra
- Exclusión de libros por ISBN en BD (con mock)
- Estadísticas incluyen nuevos campos

---

### Task 9: Verificar seed-database.ts
**Descripción**: Verificar que `seed-database.ts` ya maneja correctamente ISBNs duplicados  
**Archivo**: `apps/api/scripts/seed-database.ts`

**Verificación**:
- Ya usa `bookRepository.existsByIsbn()` antes de crear ✅
- Ya salta libros existentes con estado 'skipped' ✅
- Ya es idempotente ✅

**Tests**: Verificar tests existentes cubren este caso

---

### Task 10: Actualizar documentación
**Descripción**: Actualizar README y comentarios del script  
**Archivos**:
- `apps/api/scripts/consolidate-books.ts` (comentarios de cabecera)
- `README.md` (si es necesario actualizar sección de carga de datos)

**Cambios en comentarios**:
```typescript
/**
 * Script: consolidate-books.ts
 *
 * Consolidates multiple JSON files containing book data from original_data/
 * into a single deduplicated JSON file at docs/db/books.json.
 *
 * Features:
 * - Reads all db_libros_*.json files from original_data/
 * - Connects to database to exclude already existing books (by ISBN)
 * - Detects duplicates by id field (corresponds to ISBN)
 * - Keeps first occurrence of each ISBN (alphabetical file order)
 * - Preserves all original properties from source books
 * - Adds type: "technical" and format: "epub" to each book
 * - Deletes existing books.json before generating new one
 *
 * Requirements:
 * - Database must be running (uses DATABASE_URL env var)
 *
 * Usage:
 *   npx tsx scripts/consolidate-books.ts
 *   npm run consolidate:books
 */
```

---

## 4. Estructura de Archivos

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `apps/api/scripts/consolidate-books.ts` | Refactorización completa |
| `apps/api/tests/unit/scripts/consolidate-books.test.ts` | Actualizar tests |

### Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `apps/api/tests/integration/scripts/consolidate-books.integration.test.ts` | Tests de integración |

### Archivos Relacionados (sin cambios)

| Archivo | Notas |
|---------|-------|
| `apps/api/scripts/seed-database.ts` | Ya tiene validación de ISBN ✅ |
| `original_data/db_libros_*.json` | Archivos fuente (74 archivos) |
| `docs/db/books.json` | Archivo de salida (será regenerado) |

---

## 5. Consideraciones Técnicas

### 5.1 Conexión a Base de Datos

El script necesita conexión a PostgreSQL para:
- Consultar ISBNs existentes en la tabla `books`

**Variables de entorno requeridas**:
- `DATABASE_URL`: Connection string de PostgreSQL

### 5.2 Rutas de Directorios

```
Estructura del proyecto:
/
├── original_data/           ← SOURCE_DIR (74 archivos JSON)
│   ├── db_libros_en_1.json
│   ├── db_libros_en_2.json
│   └── ...
├── docs/
│   └── db/
│       └── books.json       ← OUTPUT_FILE (generado)
└── apps/
    └── api/
        └── scripts/
            └── consolidate-books.ts
```

**En Docker** (`/app` es la raíz de `apps/api`):
```
/app/scripts/consolidate-books.ts
/app/../original_data/           → Fuente
/app/docs/db/books.json          → Salida
```

### 5.3 Manejo de Propiedades Desconocidas

Dado que los archivos fuente pueden tener propiedades adicionales no documentadas, usamos:
- `[key: string]: unknown` en la interfaz
- Spread operator `{...source}` para copiar todas las propiedades

### 5.4 Idempotencia

El script debe ser idempotente:
1. Elimina archivo existente antes de generar
2. Consulta BD cada vez para obtener ISBNs actuales
3. No modifica la BD, solo genera archivo JSON

---

## 6. Consideraciones de Testing

### Tests Unitarios (~15 tests actualizados/nuevos)
- `enrichBook()` mantiene propiedades
- `enrichBook()` añade/sobrescribe type y format
- `isValidSourceBook()` validación flexible
- Estadísticas con nuevos campos
- Mock de BD para exclusión

### Tests de Integración (~8 tests nuevos)
- Lectura de archivos reales de original_data
- Exclusión por ISBN existente en BD
- Deduplicación entre archivos
- Preservación de propiedades
- Idempotencia

### Tests a Verificar (sin cambios)
- `seed-database.ts` - ya tiene tests de ISBN duplicado

---

## 7. Checklist de Definición de Hecho (DoD)

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Mínimo 80% de tests unitarios nuevos/actualizados
- [ ] 100% de tests de integración nuevos
- [ ] Script elimina archivo existente antes de generar
- [ ] Script lee de original_data/
- [ ] Script conecta a BD para excluir ISBNs existentes
- [ ] Script mantiene todas las propiedades originales
- [ ] Script añade type: "technical" y format: "epub"
- [ ] Script es idempotente
- [ ] Commits con estándar Conventional Commits
- [ ] 0 lint errors, 0 type errors
- [ ] Todos los tests verdes
- [ ] Build exitoso

---

## 8. Dependencias

- PostgreSQL debe estar corriendo para ejecutar el script
- Variables de entorno configuradas (`DATABASE_URL`)

---

## 9. Estimación

**Complejidad**: Media  
**Tasks**: 10  
**Tests estimados**: ~23 nuevos/actualizados
