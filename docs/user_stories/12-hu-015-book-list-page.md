# HU-015: Pantalla de Listado de Libros

## Descripción

**Como** usuario de la biblioteca digital,  
**Quiero** poder buscar y filtrar libros en el catálogo,  
**Para** encontrar rápidamente los libros que me interesan y enviarlos a mi Kindle.

## Contexto

Esta es la pantalla principal de la aplicación web. Permite a los usuarios buscar libros aplicando múltiples filtros combinados (AND) y visualizar los resultados en una tabla paginada. Los usuarios pueden enviar libros disponibles a su Kindle mediante un modal que solicita el email.

## Diseños de Referencia

| Dispositivo | Modo | Ubicación |
|-------------|------|-----------|
| Desktop | Dark | `docs/web/designs/gestor_libros_-_dark_desktop/` |
| Desktop | Light | `docs/web/designs/gestor_libros_-_light_desktop/` |
| Mobile | Dark | `docs/web/designs/gestor_libros_-_dark_mobile/` |
| Mobile | Light | Adaptar colores del diseño light desktop al layout mobile |

## Documentación de API

- **OpenAPI**: `docs/api/openapi.yaml`
- **Endpoints utilizados**:
  - `GET /api/books` - Búsqueda con filtros y paginación
  - `GET /api/book-types` - Lista de tipos de libro
  - `GET /api/book-categories?type={type}` - Categorías filtradas por tipo
  - `GET /api/book-levels?type={type}` - Niveles filtrados por tipo

---

## Criterios de Aceptación

### AC-1: Panel de Filtros

- [ ] Se muestra un panel lateral (sidebar) con los siguientes filtros:
  - **ISBN**: Input de texto
  - **Título**: Input de texto
  - **Autor**: Input de texto  
  - **Tipo**: Select único con búsqueda/filtrado de opciones (carga desde API)
  - **Categorías**: Select múltiple con búsqueda/filtrado (carga desde API, filtrado por tipo)
  - **Nivel**: Select múltiple con búsqueda/filtrado (carga desde API, filtrado por tipo)
  - **Búsqueda semántica**: Textarea con placeholder "Describe lo que buscas..."
- [ ] Los filtros se aplican automáticamente (debounce de 300ms en inputs de texto)
- [ ] Al cambiar el **Tipo**, se limpian automáticamente las selecciones de Categorías y Nivel
- [ ] Existe un botón "Limpiar filtros" que resetea todos los campos
- [ ] Todos los filtros se combinan con lógica **AND**

### AC-2: Tabla de Resultados

- [ ] La tabla muestra las siguientes columnas:
  - **ISBN**: Texto monoespaciado
  - **Título**: Texto con el título del libro
  - **Autor**: Autores separados por salto de línea si hay múltiples
  - **Tipo**: Nombre del tipo de libro
  - **Categorías**: Mostradas como chips/tags
  - **Nivel**: Badge con color según nivel (Beginner=verde, Intermediate=ámbar, Advanced=rojo, Expert=púrpura)
  - **Idioma**: Bandera del país (emoji o imagen)
  - **Descripción**: Texto truncado con tooltip que muestra descripción completa
  - **Formato**: Iconos representando el formato (PDF, EPUB, etc.)
  - **Acciones**: Icono de Kindle (solo visible si `available === true`)
- [ ] La tabla NO tiene ordenación por columnas
- [ ] Hover en filas con efecto visual sutil

### AC-3: Paginación

- [ ] Por defecto se muestran **50 libros por página**
- [ ] El paginador incluye selector para escoger entre **25, 50 y 100** registros por página
- [ ] Se muestra información de paginación: "Showing X - Y of Z books"
- [ ] Botones Previous/Next para navegar entre páginas
- [ ] Indicadores numéricos de página actual

### AC-4: Estados de la Tabla

- [ ] **Estado inicial**: Tabla vacía con mensaje invitando a realizar una búsqueda
- [ ] **Loading**: Spinner/loader mientras se ejecuta la búsqueda
- [ ] **Sin resultados**: Mensaje "No se encontraron libros" cuando la búsqueda no devuelve datos
- [ ] **Con resultados**: Tabla poblada con los datos

### AC-5: Modal Enviar a Kindle

- [ ] Al hacer click en el icono de Kindle se abre un modal/dialog
- [ ] El modal solicita el email del Kindle del usuario
- [ ] Validación del formato de email (debe contener @kindle.com idealmente)
- [ ] Botones de "Cancelar" y "Enviar"
- [ ] Feedback visual de éxito/error tras el envío

### AC-6: Responsive Design

- [ ] **Desktop**: Layout con sidebar fijo a la izquierda, tabla a la derecha
- [ ] **Mobile**: Los filtros se colapsan en un drawer/panel que se abre desde el menú
- [ ] **Mobile**: La tabla se convierte en cards (una card por libro) según el diseño mobile
- [ ] Transiciones suaves entre breakpoints

### AC-7: Temas Dark/Light

- [ ] El diseño funciona correctamente en modo oscuro
- [ ] El diseño funciona correctamente en modo claro
- [ ] Los colores siguen la guía de estilos definida en `03-web-client-design.md`
- [ ] El toggle de tema existente afecta a todos los componentes de esta pantalla

---

## Especificaciones Técnicas

### Componentes a Crear

| Componente | Tipo | Descripción |
|------------|------|-------------|
| `FilterPanelComponent` | Smart | Panel lateral con todos los filtros |
| `TextFilterInputComponent` | Presentational | Input de texto reutilizable con icono y debounce |
| `SearchableSelectComponent` | Presentational | Select con búsqueda/filtrado de opciones |
| `MultiSelectChipsComponent` | Presentational | Select múltiple que muestra selecciones como chips |
| `SemanticSearchComponent` | Presentational | Textarea para búsqueda semántica |
| `BookTableComponent` | Smart | Tabla de resultados con paginación |
| `BookTableRowComponent` | Presentational | Fila individual de la tabla |
| `BookCardComponent` | Presentational | Card para vista mobile |
| `CategoryChipsComponent` | Presentational | Chips para mostrar categorías |
| `LevelBadgeComponent` | Presentational | Badge con color según nivel |
| `FormatIconComponent` | Presentational | Icono del formato del libro |
| `LanguageFlagComponent` | Presentational | Bandera del idioma |
| `TruncatedTextComponent` | Presentational | Texto truncado con tooltip |
| `PaginatorComponent` | Presentational | Controles de paginación |
| `SendToKindleDialogComponent` | Smart | Modal para enviar a Kindle |
| `EmptyStateComponent` | Presentational | Estado vacío/sin resultados |
| `LoadingOverlayComponent` | Presentational | Overlay de carga |
| `BookListPageComponent` | Page | Página contenedora que orquesta todo |

### Servicios a Crear/Modificar

| Servicio | Descripción |
|----------|-------------|
| `BookService` | Métodos para buscar libros, obtener tipos, categorías y niveles |
| `BookSearchStore` | Store con Signals para gestionar estado de búsqueda |
| `KindleService` | Servicio para enviar libros a Kindle (mock por ahora) |

### Modelos/Interfaces

```typescript
// Basado en la API OpenAPI
interface Book {
  id: string;
  isbn: string | null;
  title: string;
  authors: Author[];
  type: string;
  categories: Category[];
  level: string | null;
  format: BookFormat;
  originalDescription: string;
  description: string;
  language: string;
  available: boolean;
  similarityScore: number | null;
}

interface Author {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface BookType {
  id: string;
  name: string;
}

interface BookLevel {
  id: string;
  name: string;
}

type BookFormat = 'epub' | 'pdf' | 'mobi' | 'azw3' | 'djvu' | 'cbz' | 'cbr' | 'txt' | 'other';

interface SearchFilters {
  isbn?: string;
  title?: string;
  author?: string;
  type?: string;
  categories?: string[];
  levels?: string[];
  text?: string;
}

interface PaginationInfo {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
  totalCount: number;
}
```

### Iconos de Formato

| Formato | Icono Material |
|---------|----------------|
| PDF | `picture_as_pdf` |
| EPUB | `book` |
| MOBI/AZW3 | `tablet_android` |
| TXT | `description` |
| Other | `insert_drive_file` |

### Colores de Nivel

| Nivel | Light Mode | Dark Mode |
|-------|------------|-----------|
| Beginner | `bg-green-100 text-green-700` | `bg-green-900/30 text-green-400` |
| Intermediate | `bg-amber-100 text-amber-700` | `bg-amber-900/30 text-amber-400` |
| Advanced | `bg-red-100 text-red-700` | `bg-red-900/30 text-red-400` |
| Expert | `bg-purple-100 text-purple-700` | `bg-purple-900/30 text-purple-400` |

### Banderas de Idioma

| Código | Bandera |
|--------|---------|
| en | 🇬🇧 o 🇺🇸 |
| es | 🇪🇸 |
| fr | 🇫🇷 |
| de | 🇩🇪 |
| it | 🇮🇹 |
| pt | 🇵🇹 |

---

## Tareas de Implementación

### Tarea 1: Configurar Storybook
**Estimación**: 1 hora

- [ ] Instalar Storybook en el proyecto web-client
- [ ] Configurar Storybook para Angular 21 con Material
- [ ] Crear estructura de carpetas para stories
- [ ] Verificar que Storybook arranca correctamente

### Tarea 2: Crear componentes base de filtros
**Estimación**: 3 horas

- [ ] `TextFilterInputComponent` - Input con icono, label y debounce
- [ ] `SearchableSelectComponent` - Select con búsqueda (mat-select + filtro)
- [ ] `MultiSelectChipsComponent` - Select múltiple con chips de selección
- [ ] `SemanticSearchComponent` - Textarea con placeholder
- [ ] Tests unitarios para cada componente
- [ ] Stories de Storybook para cada componente
- [ ] Documentación Markdown en `docs/web/story_books/`

### Tarea 3: Crear componentes de visualización de datos
**Estimación**: 2.5 horas

- [ ] `CategoryChipsComponent` - Chips para categorías
- [ ] `LevelBadgeComponent` - Badge con color según nivel
- [ ] `FormatIconComponent` - Icono del formato
- [ ] `LanguageFlagComponent` - Bandera del idioma
- [ ] `TruncatedTextComponent` - Texto con tooltip
- [ ] Tests unitarios para cada componente
- [ ] Stories de Storybook para cada componente
- [ ] Documentación Markdown

### Tarea 4: Crear componentes de tabla y paginación
**Estimación**: 3 horas

- [ ] `BookTableRowComponent` - Fila de la tabla
- [ ] `BookTableComponent` - Tabla completa con mat-table
- [ ] `PaginatorComponent` - Paginador con selector de registros
- [ ] `BookCardComponent` - Card para vista mobile
- [ ] `EmptyStateComponent` - Estados vacío/inicial/sin resultados
- [ ] `LoadingOverlayComponent` - Overlay de carga
- [ ] Tests unitarios
- [ ] Stories de Storybook
- [ ] Documentación Markdown

### Tarea 5: Crear FilterPanelComponent
**Estimación**: 2 horas

- [ ] Integrar todos los componentes de filtros
- [ ] Implementar lógica de dependencia Tipo → Categorías/Niveles
- [ ] Implementar botón "Limpiar filtros"
- [ ] Implementar debounce en inputs de texto
- [ ] Emitir eventos de cambio de filtros
- [ ] Tests unitarios
- [ ] Story de Storybook
- [ ] Documentación Markdown

### Tarea 6: Crear servicios y store
**Estimación**: 2.5 horas

- [ ] `BookService` - Métodos HTTP para la API
- [ ] `BookSearchStore` - Store con Signals para estado
- [ ] `KindleService` - Mock del servicio de envío
- [ ] Tests unitarios para servicios
- [ ] Tests de integración con API mockeada

### Tarea 7: Crear SendToKindleDialogComponent
**Estimación**: 1.5 horas

- [ ] Modal con mat-dialog
- [ ] Input de email con validación
- [ ] Estados de loading/success/error
- [ ] Tests unitarios
- [ ] Story de Storybook
- [ ] Documentación Markdown

### Tarea 8: Crear BookListPageComponent
**Estimación**: 3 horas

- [ ] Integrar FilterPanel, BookTable y estados
- [ ] Conectar con BookSearchStore
- [ ] Implementar layout responsive (sidebar + main content)
- [ ] Implementar vista mobile con drawer para filtros
- [ ] Manejar estados (inicial, loading, resultados, vacío)
- [ ] Tests unitarios
- [ ] Tests de integración

### Tarea 9: Configurar rutas y navegación
**Estimación**: 1 hora

- [ ] Añadir ruta para la página de listado de libros
- [ ] Configurar como ruta principal (`/` o `/books`)
- [ ] Lazy loading del módulo catalog
- [ ] Verificar navegación

### Tarea 10: Tests E2E
**Estimación**: 3 horas

- [ ] Configurar Playwright si no está configurado
- [ ] Test: Carga inicial de la página
- [ ] Test: Aplicar filtro de texto y ver resultados
- [ ] Test: Filtrar por tipo y verificar limpieza de categorías/niveles
- [ ] Test: Paginación (cambiar página, cambiar registros por página)
- [ ] Test: Abrir modal de Kindle y enviar
- [ ] Test: Verificar responsive (desktop vs mobile)
- [ ] Test: Verificar tema dark/light

### Tarea 11: Revisión y refactorización
**Estimación**: 2 horas

- [ ] Code review del código implementado
- [ ] Refactorizar código duplicado
- [ ] Verificar cobertura de tests (mínimo 80%)
- [ ] Verificar que ESLint pasa sin errores
- [ ] Verificar accesibilidad (a11y)
- [ ] Optimización de rendimiento si es necesario

### Tarea 12: Actualizar documentación
**Estimación**: 1 hora

- [ ] Actualizar README del web-client si es necesario
- [ ] Verificar que todos los componentes tienen su story
- [ ] Verificar que todos los componentes tienen su doc en Markdown
- [ ] Actualizar design doc si hay cambios arquitectónicos

---

## Estimación Total

| Fase | Horas |
|------|-------|
| Configuración | 1 |
| Componentes base | 8.5 |
| Servicios | 2.5 |
| Página | 4 |
| Tests E2E | 3 |
| Revisión | 3 |
| **Total** | **22 horas** |

---

## Dependencias

- HU-014: Configuración inicial del Web Client (completada)
- API: Endpoints de búsqueda de libros funcionando (completado)

---

## Notas de Implementación

### Patrón Criteria

Los filtros deben construirse siguiendo el patrón Criteria según la documentación de la API. Ejemplo de query string:

```
GET /api/books?title=Clean&author=Martin&types=technical&categories=programming&levels=Intermediate&limit=50
```

### Debounce en Filtros

Usar `debounceTime(300)` de RxJS para los inputs de texto (ISBN, título, autor, búsqueda semántica) para evitar llamadas excesivas a la API.

### Accesibilidad

- Todos los inputs deben tener labels asociados
- Los iconos de acción deben tener `aria-label`
- El modal debe atrapar el foco
- Navegación por teclado en la tabla

### Performance

- Considerar virtual scrolling si hay muchos resultados
- Lazy load de imágenes de banderas si se usan imágenes
- OnPush change detection en componentes presentacionales
