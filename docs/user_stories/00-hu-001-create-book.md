# Design Doc: HU-001 - Registro de Libros con Representación Vectorial

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-001 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-08 |
| **Prioridad** | Alta |
| **Estimación** | A definir |

---

## 1. Historia de Usuario

**Como** Administrador único del sistema,  
**Quiero** registrar libros en el catálogo asegurando que no existan duplicados y generando su representación vectorial (embedding) de forma obligatoria,  
**Para** asegurar la integridad de la base de datos y permitir búsquedas semánticas precisas en el futuro.

---

## 2. Criterios de Aceptación

### 2.1 Preparación y Normalización de Datos

| Criterio | Descripción |
|----------|-------------|
| **Sanitización** | El sistema debe aplicar `trim()` a todos los campos de texto antes de procesarlos |
| **Descripción obligatoria** | La descripción es un campo **obligatorio** y no puede estar vacío ni ser nulo |

### 2.2 Reglas de Validación de Duplicados

| Regla | Descripción |
|-------|-------------|
| **ISBN único** | Si se provee ISBN, debe tener formato válido (10 o 13 dígitos con checksum correcto). No puede estar repetido en la base de datos |

### 2.3 Gestión de Entidades Relacionadas

| Regla | Descripción |
|-------|-------------|
| **Múltiples autores** | Un libro puede tener entre 1 y 10 autores |
| **Auto-creación de autores** | Si el libro incluye un autor que no existe en el sistema, se creará automáticamente |
| **Múltiples categorías** | Un libro puede tener entre 1 y 10 categorías |
| **Auto-creación de categorías** | Si el libro incluye una categoría que no existe en el sistema, se creará automáticamente |
| **Tipo de libro dinámico** | El tipo de libro (`type`) es una entidad dinámica, no un enum fijo. Se crea automáticamente si no existe |
| **Sin duplicados** | No se permiten autores o categorías duplicadas en el mismo libro (validación por ID) |

### 2.4 Generación de Embeddings

| Paso | Descripción |
|------|-------------|
| **Concatenación** | Se unifica en un string: `autores + título + tipo + categorías + descripción` |
| **Límite de caracteres** | El string resultante no debe superar los **7000 caracteres**. Si supera este límite, se rechaza la creación con error de validación |
| **Servicio** | Se llama al servicio local de embeddings (Ollama + nomic-embed-text en Docker) |
| **Atomicidad** | El proceso es síncrono y atómico: si el servicio de embedding no responde, el libro NO se crea en la base de datos |
| **Dimensión** | El vector resultante tiene 768 dimensiones |

### 2.5 Salida y Trazabilidad

| Interfaz | Comportamiento |
|----------|----------------|
| **API** | Retorna el libro creado en formato JSON (sin el embedding) |

#### Logs del Sistema

El sistema debe registrar logs detallados de:
- Errores de conexión con el servicio de embedding
- Intentos de creación de duplicados (ISBN)
- Errores de validación de ISBN
- Creación exitosa de libros (nivel INFO)

---

## 3. Restricciones y Corner Cases

### 3.1 Inmutabilidad Post-Creación

Una vez creado el registro, **NO se permite la edición** de ningún campo que haya sido parte de la generación del embedding:

| Campo | Editable |
|-------|----------|
| `title` | NO |
| `author` | NO |
| `type` | NO |
| `categories` | NO |
| `description` | NO |
| `isbn` | NO |
| `format` | NO |
| `available` | **SÍ** |
| `path` | **SÍ** |

### 3.2 Disponibilidad del Servicio de Embeddings

Si el contenedor de Ollama no está accesible, se debe:
- Devolver un error claro: **"Servicio de embeddings no disponible, intente más tarde"**
- En API: Retornar `503 Service Unavailable`
- En CLI: Mostrar mensaje de error y salir con código de error

### 3.3 Concurrencia

El sistema está diseñado para un **único usuario administrador**. No se requiere manejo de concurrencia avanzado.

---

## 4. Límites de Campos

| Campo | Límite | Validación |
|-------|--------|------------|
| `title` | 500 caracteres | Obligatorio |
| `authors` | 1-10 autores | Obligatorio (mínimo 1) |
| `author.name` | 300 caracteres | Obligatorio |
| `description` | 5000 caracteres | **Obligatorio** |
| `type` | 100 caracteres | Obligatorio, auto-creado si no existe |
| `categories` | 1-10 categorías | Obligatorio (mínimo 1) |
| `category.name` | 100 caracteres | Obligatorio |
| `path` | 1000 caracteres | Opcional |
| `isbn` | 10 o 13 dígitos | Opcional, validación de checksum |
| **Embedding text** | 7000 caracteres | Concatenación de campos |

---

## 5. Respuestas HTTP (API)

| Código | Situación |
|--------|-----------|
| `201 Created` | Libro creado exitosamente |
| `400 Bad Request` | Validación fallida (campos inválidos, texto de embedding > 7000 chars) |
| `409 Conflict` | Duplicado detectado (ISBN repetido) |
| `503 Service Unavailable` | Servicio de embeddings no disponible |

---

## 6. Flujo de Creación (Transaccional)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CreateBookUseCase                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. VALIDAR DATOS DE ENTRADA                                         │
│    - Sanitizar campos (trim)                                        │
│    - Validar campos obligatorios                                    │
│    - Validar formato ISBN (si existe)                               │
│    - Validar límites de caracteres                                  │
│    - Validar máximo 10 autores y 10 categorías                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. VERIFICAR DUPLICADOS (Repository)                                │
│    - Si ISBN existe → Error 409 "ISBN ya registrado"                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. GESTIONAR ENTIDADES RELACIONADAS                                 │
│    - Por cada autor:                                                │
│      - Si existe → usar el existente                                │
│      - Si no existe → crear nuevo autor                             │
│    - Por cada categoría:                                            │
│      - Si existe → usar la existente                                │
│      - Si no existe → crear nueva categoría                         │
│    - Para el tipo de libro:                                         │
│      - Si existe → usar el existente                                │
│      - Si no existe → crear nuevo tipo                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. GENERAR EMBEDDING                                                │
│    - Concatenar: autores + título + tipo + categorías + descripción │
│    - Validar longitud ≤ 7000 chars                                  │
│    - Llamar a EmbeddingService (Ollama)                             │
│    - Si falla → Error 503, NO se crea el libro                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. PERSISTIR (Transacción atómica)                                  │
│    BEGIN TRANSACTION                                                │
│      - INSERT autores nuevos                                        │
│      - INSERT tipo nuevo (si aplica)                                │
│      - INSERT categorías nuevas                                     │
│      - INSERT libro                                                 │
│      - INSERT relaciones book_authors                               │
│      - INSERT relaciones book_categories                            │
│    COMMIT                                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. RETORNAR RESULTADO                                               │
│    - API: Retornar JSON del libro (sin embedding)                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Arquitectura (Ports & Adapters)

### 7.1 Capa de Dominio

La lógica de validación reside en el Core (Dominio/Aplicación):
- Entidad `Book` con validaciones de negocio
- Entidad `Author` para autores
- Entidad `Category` para categorías
- Entidad `BookType` para tipos de libro (dinámico, no enum)
- Value Objects: `ISBN`, `BookFormat`
- Errores de dominio específicos

### 7.2 Puertos de Salida (Driven)

| Puerto | Responsabilidad |
|--------|-----------------|
| `BookRepository` | Verificar duplicados (ISBN), persistir libro |
| `AuthorRepository` | Buscar/crear autores |
| `CategoryRepository` | Buscar/crear categorías |
| `TypeRepository` | Buscar/crear tipos de libro |
| `EmbeddingService` | Comunicación con Ollama para generar vectores |

### 7.3 Puertos de Entrada (Driver)

| Puerto | Responsabilidad |
|--------|-----------------|
| `BookService` | Expone `createBook()` a los adaptadores |

### 7.4 Adaptadores

| Adaptador | Tipo | Descripción |
|-----------|------|-------------|
| HTTP Controller (Fastify) | Driver | Recibe POST /books, llama al servicio, formatea respuesta JSON |
| PostgresBookRepository | Driven | Implementa persistencia con Drizzle ORM |
| PostgresAuthorRepository | Driven | Implementa persistencia de autores |
| PostgresCategoryRepository | Driven | Implementa persistencia de categorías |
| PostgresTypeRepository | Driven | Implementa persistencia de tipos de libro |
| OllamaEmbeddingService | Driven | Llama a Ollama API para generar embeddings |

---

## 8. Modelo de Datos

### 8.1 Entidad Book

```typescript
interface Book {
  id: UUID;
  isbn: ISBN | null;
  title: string;              // max 500
  authors: Author[];          // 1-10 autores
  description: string;        // max 5000, OBLIGATORIO
  type: BookType;             // entidad dinámica
  categories: Category[];     // 1-10
  format: BookFormat;
  available: boolean;
  path: string | null;        // max 1000
  embedding: number[];        // 768 dimensiones
  createdAt: Date;
  updatedAt: Date;
}
```

### 8.2 Entidad Author

```typescript
interface Author {
  id: UUID;
  name: string;               // max 300, normalizado
  createdAt: Date;
  updatedAt: Date;
}
```

### 8.3 Entidad BookType

```typescript
interface BookType {
  id: UUID;
  name: string;               // max 100, normalizado a lowercase
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 9. Servicio de Embeddings

| Configuración | Valor |
|---------------|-------|
| **Modelo** | nomic-embed-text |
| **Servicio** | Ollama (Docker) |
| **Endpoint** | `POST http://ollama:11434/api/embeddings` |
| **Dimensión del vector** | 768 |
| **Timeout recomendado** | 30 segundos |

### Request

```json
{
  "model": "nomic-embed-text",
  "prompt": "Robert C. Martin Clean Code technical programming, software engineering A handbook of agile software craftsmanship..."
}
```

### Response

```json
{
  "embedding": [0.123, -0.456, 0.789, ...]
}
```

---

## 10. Cambios Requeridos en el Dominio

### 10.1 Hacer `description` obligatorio

Modificar `Book.ts` para que `description` sea requerido:
- Cambiar tipo de `string | null` a `string`
- Añadir validación `RequiredFieldError` si está vacío
- Actualizar tests correspondientes

---

## 11. Definición de Hecho (DoD)

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Mínimo 80% de tests unitarios y 100% de tests funcionales nuevos/afectados
- [ ] Campo `description` obligatorio en dominio
- [ ] Validación de duplicados implementada (ISBN)
- [ ] Auto-creación de autores, categorías y tipos
- [ ] Integración con servicio de embeddings
- [ ] Endpoint API `POST /books` funcionando
- [ ] Logs implementados para errores y operaciones
- [ ] Documentación actualizada si el diseño cambia
- [ ] 0 lint errors, 0 type errors, all tests green, build success

---

## 12. Referencias

- [01-project-overview.md](./01-project-overview.md) - Stack tecnológico y modelo de dominio
- [02-project-structure.md](./02-project-structure.md) - Arquitectura hexagonal
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [nomic-embed-text Model](https://huggingface.co/nomic-ai/nomic-embed-text-v1)
