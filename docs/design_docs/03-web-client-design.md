# Design Doc: Web Client (Angular)

## 1. Resumen Ejecutivo

Este documento define la arquitectura y diseño del cliente web para el sistema Library. El cliente web es una aplicación Angular que permite a los usuarios buscar libros en el catálogo y enviarlos a su dispositivo Kindle.

### 1.1 Objetivos

- Proporcionar una interfaz web responsive para búsqueda de libros
- Permitir el envío de libros a Kindle mediante email
- Ofrecer una experiencia de usuario fluida en desktop y mobile
- Mantener consistencia arquitectónica con el backend (DDD, Clean Architecture)

### 1.2 Alcance

**Incluido:**
- Búsqueda de libros con filtros (título, autor, tipo, categoría, nivel, búsqueda semántica)
- Visualización de resultados en formato tabla/lista
- Detalle de libro
- Envío de libro a Kindle (introduciendo email)
- Tema dark/light con toggle
- Diseño responsive (desktop + mobile)

**Excluido:**
- Autenticación/autorización de usuarios
- Gestión de usuarios
- Creación/edición/eliminación de libros desde la web
- Importación masiva de libros
- Subida de portadas
- Modo offline (PWA)
- Multiidioma (solo español)

---

## 2. Arquitectura

### 2.1 Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Angular | 19.x (última estable) |
| Lenguaje | TypeScript | 5.x |
| State Management | Angular Signals | Built-in |
| Estilos | SCSS + CSS Variables | - |
| HTTP Client | Angular HttpClient | Built-in |
| Routing | Angular Router | Built-in |
| UI Components | Custom Design System | - |
| Component Docs | Storybook | 8.x |
| Testing Unit | Vitest + Angular Testing Library | Latest |
| Testing E2E | Playwright | Latest |
| Build Tool | Angular CLI (esbuild) | 19.x |

### 2.2 Arquitectura de Capas

Siguiendo los principios de Clean Architecture y DDD aplicados al frontend:

```
src/
├── app/
│   ├── core/                    # Singleton services, guards, interceptors
│   │   ├── services/            # API services, theme service
│   │   ├── interceptors/        # HTTP interceptors (error handling, loading)
│   │   └── models/              # Domain models/interfaces
│   │
│   ├── features/                # Feature modules (lazy loaded)
│   │   ├── book-search/         # Búsqueda de libros
│   │   │   ├── components/      # Componentes de la feature
│   │   │   ├── pages/           # Páginas/routes
│   │   │   ├── services/        # Services específicos de la feature
│   │   │   └── book-search.routes.ts
│   │   │
│   │   └── book-detail/         # Detalle de libro + envío Kindle
│   │       ├── components/
│   │       ├── pages/
│   │       └── book-detail.routes.ts
│   │
│   ├── shared/                  # Componentes y utilidades compartidas
│   │   ├── components/          # UI components reutilizables
│   │   ├── directives/          # Directivas custom
│   │   ├── pipes/               # Pipes custom
│   │   └── utils/               # Utilidades
│   │
│   ├── layouts/                 # Layout components
│   │   └── main-layout/         # Header, footer, contenedor principal
│   │
│   └── app.routes.ts            # Rutas principales
│
├── assets/                      # Recursos estáticos
├── styles/                      # Estilos globales
│   ├── _variables.scss          # Variables CSS/SCSS
│   ├── _themes.scss             # Definición de temas
│   ├── _typography.scss         # Tipografía
│   └── styles.scss              # Entry point
│
└── environments/                # Configuración por entorno
```

### 2.3 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         MainLayout                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Header                              │    │
│  │  [Logo]                              [Theme Toggle]      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Router Outlet                          │    │
│  │                                                          │    │
│  │   ┌─────────────────────────────────────────────────┐   │    │
│  │   │            BookSearchPage                        │   │    │
│  │   │  ┌─────────────────────────────────────────┐    │   │    │
│  │   │  │         SearchFiltersComponent           │    │   │    │
│  │   │  │  [Text] [Type] [Category] [Level] [Author]│   │   │    │
│  │   │  └─────────────────────────────────────────┘    │   │    │
│  │   │                                                  │   │    │
│  │   │  ┌─────────────────────────────────────────┐    │   │    │
│  │   │  │         BookTableComponent               │    │   │    │
│  │   │  │  ┌─────┬────────┬────────┬─────┬─────┐  │    │   │    │
│  │   │  │  │Title│ Author │  Type  │Level│ ... │  │    │   │    │
│  │   │  │  ├─────┼────────┼────────┼─────┼─────┤  │    │   │    │
│  │   │  │  │ ... │  ...   │  ...   │ ... │ ... │  │    │   │    │
│  │   │  │  └─────┴────────┴────────┴─────┴─────┘  │    │   │    │
│  │   │  │              [Pagination]                │    │   │    │
│  │   │  └─────────────────────────────────────────┘    │   │    │
│  │   └─────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │   ┌─────────────────────────────────────────────────┐   │    │
│  │   │            BookDetailPage                        │   │    │
│  │   │  ┌──────────────────┐ ┌────────────────────┐    │   │    │
│  │   │  │  BookInfoCard    │ │ SendToKindleForm   │    │   │    │
│  │   │  │                  │ │ [Email input]      │    │   │    │
│  │   │  │  Title, Author,  │ │ [Send button]      │    │   │    │
│  │   │  │  Description...  │ │                    │    │   │    │
│  │   │  └──────────────────┘ └────────────────────┘    │   │    │
│  │   └─────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Footer                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Diseño de Features

### 3.1 Feature: Búsqueda de Libros

#### 3.1.1 Descripción
Página principal que permite buscar libros aplicando múltiples filtros y visualizar los resultados en una tabla paginada.

#### 3.1.2 Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `BookSearchPage` | Página contenedora, orquesta la búsqueda |
| `SearchFiltersComponent` | Formulario de filtros de búsqueda |
| `BookTableComponent` | Tabla de resultados con paginación |
| `BookRowComponent` | Fila individual de la tabla |

#### 3.1.3 Filtros Disponibles

| Filtro | Tipo | Descripción |
|--------|------|-------------|
| Texto (semántico) | Input text | Búsqueda semántica por descripción |
| Título | Input text | Filtro por título (parcial, case-insensitive) |
| Autor | Input text | Filtro por autor (parcial, case-insensitive) |
| Tipo | Select múltiple | Filtro por tipo de libro |
| Categoría | Select múltiple | Filtro por categoría |
| Nivel | Select | Filtro por nivel de dificultad |

#### 3.1.4 Interacción con API

```typescript
// GET /api/books
interface SearchBooksRequest {
  text?: string;           // Búsqueda semántica
  title?: string;          // Filtro por título
  author?: string;         // Filtro por autor
  types?: string[];        // IDs de tipos
  categories?: string[];   // IDs de categorías
  level?: string;          // ID de nivel
  limit?: number;          // Paginación (default: 20)
  cursor?: string;         // Cursor para siguiente página
}

interface SearchBooksResponse {
  data: Book[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}
```

#### 3.1.5 Estado (Signals)

```typescript
// book-search.store.ts
interface BookSearchState {
  books: Book[];
  filters: SearchFilters;
  pagination: PaginationInfo;
  loading: boolean;
  error: string | null;
}

// Signals
const books = signal<Book[]>([]);
const filters = signal<SearchFilters>(defaultFilters);
const loading = signal<boolean>(false);
const error = signal<string | null>(null);
const pagination = signal<PaginationInfo>({ hasMore: false });

// Computed
const isEmpty = computed(() => books().length === 0 && !loading());
const hasResults = computed(() => books().length > 0);
```

---

### 3.2 Feature: Detalle de Libro

#### 3.2.1 Descripción
Página que muestra la información completa de un libro y permite enviarlo a Kindle.

#### 3.2.2 Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `BookDetailPage` | Página contenedora |
| `BookInfoCardComponent` | Muestra información del libro |
| `SendToKindleFormComponent` | Formulario para enviar a Kindle |
| `SendToKindleDialogComponent` | Modal de confirmación/resultado |

#### 3.2.3 Información Mostrada

- Título
- Autor(es)
- Descripción (traducida al español)
- Tipo de libro
- Categorías
- Nivel
- Formato(s) disponibles
- ISBN (si existe)

#### 3.2.4 Flujo Envío a Kindle

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ Usuario hace │────▶│ Modal solicita    │────▶│ Validación email │
│ click "Enviar│     │ email Kindle      │     │ formato válido   │
│ a Kindle"    │     │ (@kindle.com)     │     │                  │
└──────────────┘     └───────────────────┘     └────────┬─────────┘
                                                        │
                     ┌───────────────────┐              │
                     │ Confirmación      │◀─────────────┘
                     │ "Enviando..."     │
                     │ [Loading spinner] │
                     └────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │ Success  │   │  Error   │   │ Error:       │
        │ "Enviado │   │ "Fallo   │   │ "Formato no  │
        │ correcta-│   │ al enviar│   │ compatible"  │
        │ mente"   │   │ Reintentar│  │              │
        └──────────┘   └──────────┘   └──────────────┘
```

#### 3.2.5 Interacción con API

```typescript
// POST /api/books/:id/send-to-kindle
interface SendToKindleRequest {
  email: string;  // Email Kindle del usuario
  format?: string; // Formato preferido (opcional)
}

interface SendToKindleResponse {
  success: boolean;
  message: string;
}
```

---

## 4. Filosofía de Componentización

### 4.1 Principios Fundamentales

La aplicación sigue una filosofía de **componentización estricta** basada en los siguientes principios:

1. **Reutilización:** Cada componente se diseña para ser reutilizable en múltiples contextos
2. **Consistencia:** Todos los elementos UI comparten los mismos tokens de diseño
3. **Aislamiento:** Los componentes son independientes y no dependen del contexto donde se usan
4. **Documentación:** Cada componente está documentado en Storybook con ejemplos y variantes
5. **Testabilidad:** Los componentes atómicos son fácilmente testeables de forma aislada

### 4.2 Atomic Design

Seguimos la metodología **Atomic Design** de Brad Frost, organizando los componentes en niveles de abstracción:

```
┌─────────────────────────────────────────────────────────────────┐
│                         PAGES                                    │
│   Páginas completas que combinan templates con datos reales     │
│   Ejemplo: BookSearchPage, BookDetailPage                        │
├─────────────────────────────────────────────────────────────────┤
│                       TEMPLATES                                  │
│   Layouts de página que definen la estructura                   │
│   Ejemplo: MainLayout, SearchLayout                              │
├─────────────────────────────────────────────────────────────────┤
│                       ORGANISMS                                  │
│   Componentes complejos formados por moléculas y átomos         │
│   Ejemplo: BookTable, SearchFilters, BookInfoCard               │
├─────────────────────────────────────────────────────────────────┤
│                       MOLECULES                                  │
│   Grupos de átomos que funcionan juntos como unidad             │
│   Ejemplo: SearchInput, FilterDropdown, Pagination              │
├─────────────────────────────────────────────────────────────────┤
│                         ATOMS                                    │
│   Elementos UI básicos e indivisibles                           │
│   Ejemplo: Button, Input, Badge, Icon, Spinner                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Estructura de Componentes

```
src/app/
├── shared/
│   ├── ui/                          # Design System Components
│   │   ├── atoms/
│   │   │   ├── button/
│   │   │   │   ├── button.component.ts
│   │   │   │   ├── button.component.scss
│   │   │   │   ├── button.component.spec.ts
│   │   │   │   └── button.stories.ts
│   │   │   ├── input/
│   │   │   ├── badge/
│   │   │   ├── icon/
│   │   │   ├── spinner/
│   │   │   ├── checkbox/
│   │   │   ├── toggle/
│   │   │   └── index.ts
│   │   │
│   │   ├── molecules/
│   │   │   ├── search-input/
│   │   │   ├── select/
│   │   │   ├── multi-select/
│   │   │   ├── pagination/
│   │   │   ├── toast/
│   │   │   ├── modal/
│   │   │   ├── card/
│   │   │   └── index.ts
│   │   │
│   │   ├── organisms/
│   │   │   ├── data-table/
│   │   │   ├── filter-panel/
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                 # Public API del Design System
│   │
│   └── utils/                       # Utilidades compartidas
│
└── features/                        # Features usan componentes de shared/ui
```

### 4.4 Convenciones de Componentes

#### 4.4.1 Nomenclatura

| Tipo | Prefijo | Ejemplo |
|------|---------|---------|
| Átomo | `Ui` | `UiButtonComponent`, `UiInputComponent` |
| Molécula | `Ui` | `UiSearchInputComponent`, `UiSelectComponent` |
| Organismo | `Ui` | `UiDataTableComponent`, `UiFilterPanelComponent` |
| Feature | - | `BookTableComponent`, `SearchFiltersComponent` |

#### 4.4.2 Estructura de un Componente

```typescript
// shared/ui/atoms/button/button.component.ts
import { Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  host: {
    '[class]': 'hostClasses()',
    '[attr.disabled]': 'disabled() || loading() ? true : null',
  },
})
export class UiButtonComponent {
  // Inputs con Signals
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  
  // Outputs
  readonly clicked = output<MouseEvent>();
  
  // Computed
  protected readonly hostClasses = computed(() => {
    return [
      'ui-button',
      `ui-button--${this.variant()}`,
      `ui-button--${this.size()}`,
      this.fullWidth() ? 'ui-button--full-width' : '',
      this.loading() ? 'ui-button--loading' : '',
    ].filter(Boolean).join(' ');
  });
  
  onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
```

#### 4.4.3 API de Componentes

Todos los componentes siguen estas reglas:

1. **Inputs tipados:** Usar `input<T>()` con tipos estrictos
2. **Outputs descriptivos:** Usar verbos en pasado (`clicked`, `changed`, `submitted`)
3. **Valores por defecto:** Siempre proporcionar defaults sensatos
4. **Sin lógica de negocio:** Los componentes UI son "tontos" (presentational)
5. **Accesibilidad:** ARIA labels, roles y keyboard navigation

---

## 5. Design System

### 5.1 Design Tokens

Los design tokens son las variables fundamentales que definen el sistema visual. Se definen una sola vez y se usan en toda la aplicación.

#### 5.1.1 Estructura de Tokens

```
src/styles/
├── tokens/
│   ├── _colors.scss           # Paleta de colores
│   ├── _typography.scss       # Fuentes, tamaños, line-heights
│   ├── _spacing.scss          # Espaciados y márgenes
│   ├── _borders.scss          # Bordes y radios
│   ├── _shadows.scss          # Sombras
│   ├── _breakpoints.scss      # Puntos de quiebre responsive
│   ├── _z-index.scss          # Capas de z-index
│   ├── _animations.scss       # Duraciones y easings
│   └── _index.scss            # Exporta todos los tokens
│
├── themes/
│   ├── _light.scss            # Tema claro
│   ├── _dark.scss             # Tema oscuro
│   └── _index.scss            # Gestión de temas
│
├── base/
│   ├── _reset.scss            # Reset CSS
│   ├── _typography.scss       # Estilos base de tipografía
│   └── _index.scss
│
└── styles.scss                # Entry point
```

#### 5.1.2 Tokens de Color

```scss
// tokens/_colors.scss

// Colores primitivos (no usar directamente en componentes)
$primitive-colors: (
  // Grays
  'gray-50': #fafafa,
  'gray-100': #f5f5f5,
  'gray-200': #e5e5e5,
  'gray-300': #d4d4d4,
  'gray-400': #a3a3a3,
  'gray-500': #737373,
  'gray-600': #525252,
  'gray-700': #404040,
  'gray-800': #262626,
  'gray-900': #171717,
  'gray-950': #0a0a0a,
  
  // Brand
  'blue-50': #eff6ff,
  'blue-500': #3b82f6,
  'blue-600': #2563eb,
  'blue-700': #1d4ed8,
  
  // Semantic
  'green-500': #22c55e,
  'green-600': #16a34a,
  'red-500': #ef4444,
  'red-600': #dc2626,
  'amber-500': #f59e0b,
  'amber-600': #d97706,
);

// Tokens semánticos (usar estos en componentes)
:root {
  // Backgrounds
  --color-bg-primary: #{map-get($primitive-colors, 'gray-50')};
  --color-bg-secondary: #{map-get($primitive-colors, 'gray-100')};
  --color-bg-tertiary: #{map-get($primitive-colors, 'gray-200')};
  --color-bg-inverse: #{map-get($primitive-colors, 'gray-900')};
  
  // Text
  --color-text-primary: #{map-get($primitive-colors, 'gray-900')};
  --color-text-secondary: #{map-get($primitive-colors, 'gray-600')};
  --color-text-tertiary: #{map-get($primitive-colors, 'gray-500')};
  --color-text-inverse: #{map-get($primitive-colors, 'gray-50')};
  --color-text-link: #{map-get($primitive-colors, 'blue-600')};
  
  // Borders
  --color-border-primary: #{map-get($primitive-colors, 'gray-200')};
  --color-border-secondary: #{map-get($primitive-colors, 'gray-300')};
  --color-border-focus: #{map-get($primitive-colors, 'blue-500')};
  
  // Interactive
  --color-interactive-primary: #{map-get($primitive-colors, 'blue-600')};
  --color-interactive-primary-hover: #{map-get($primitive-colors, 'blue-700')};
  --color-interactive-secondary: #{map-get($primitive-colors, 'gray-100')};
  --color-interactive-secondary-hover: #{map-get($primitive-colors, 'gray-200')};
  
  // Feedback
  --color-success: #{map-get($primitive-colors, 'green-500')};
  --color-success-bg: #{map-get($primitive-colors, 'green-50')};
  --color-error: #{map-get($primitive-colors, 'red-500')};
  --color-error-bg: #{map-get($primitive-colors, 'red-50')};
  --color-warning: #{map-get($primitive-colors, 'amber-500')};
  --color-warning-bg: #{map-get($primitive-colors, 'amber-50')};
}
```

#### 5.1.3 Tokens de Tipografía

```scss
// tokens/_typography.scss

// Font families
:root {
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

// Font sizes (escala modular 1.25)
$font-sizes: (
  'xs': 0.75rem,      // 12px
  'sm': 0.875rem,     // 14px
  'base': 1rem,       // 16px
  'lg': 1.125rem,     // 18px
  'xl': 1.25rem,      // 20px
  '2xl': 1.5rem,      // 24px
  '3xl': 1.875rem,    // 30px
  '4xl': 2.25rem,     // 36px
);

// Line heights
$line-heights: (
  'tight': 1.25,
  'normal': 1.5,
  'relaxed': 1.75,
);

// Font weights
$font-weights: (
  'normal': 400,
  'medium': 500,
  'semibold': 600,
  'bold': 700,
);

:root {
  @each $name, $size in $font-sizes {
    --font-size-#{$name}: #{$size};
  }
  @each $name, $height in $line-heights {
    --line-height-#{$name}: #{$height};
  }
  @each $name, $weight in $font-weights {
    --font-weight-#{$name}: #{$weight};
  }
}

// Typography presets (usar estos en componentes)
@mixin text-xs { font-size: var(--font-size-xs); line-height: var(--line-height-normal); }
@mixin text-sm { font-size: var(--font-size-sm); line-height: var(--line-height-normal); }
@mixin text-base { font-size: var(--font-size-base); line-height: var(--line-height-normal); }
@mixin text-lg { font-size: var(--font-size-lg); line-height: var(--line-height-normal); }
@mixin text-xl { font-size: var(--font-size-xl); line-height: var(--line-height-tight); }
@mixin text-2xl { font-size: var(--font-size-2xl); line-height: var(--line-height-tight); }
@mixin text-3xl { font-size: var(--font-size-3xl); line-height: var(--line-height-tight); }

@mixin heading-1 { @include text-3xl; font-weight: var(--font-weight-bold); }
@mixin heading-2 { @include text-2xl; font-weight: var(--font-weight-semibold); }
@mixin heading-3 { @include text-xl; font-weight: var(--font-weight-semibold); }
@mixin heading-4 { @include text-lg; font-weight: var(--font-weight-medium); }

@mixin body-base { @include text-base; font-weight: var(--font-weight-normal); }
@mixin body-sm { @include text-sm; font-weight: var(--font-weight-normal); }
@mixin caption { @include text-xs; font-weight: var(--font-weight-normal); color: var(--color-text-secondary); }
```

#### 5.1.4 Tokens de Espaciado

```scss
// tokens/_spacing.scss

// Escala de espaciado (base 4px)
$spacing: (
  '0': 0,
  '1': 0.25rem,    // 4px
  '2': 0.5rem,     // 8px
  '3': 0.75rem,    // 12px
  '4': 1rem,       // 16px
  '5': 1.25rem,    // 20px
  '6': 1.5rem,     // 24px
  '8': 2rem,       // 32px
  '10': 2.5rem,    // 40px
  '12': 3rem,      // 48px
  '16': 4rem,      // 64px
  '20': 5rem,      // 80px
  '24': 6rem,      // 96px
);

:root {
  @each $name, $value in $spacing {
    --spacing-#{$name}: #{$value};
  }
}

// Spacing utilities
@mixin gap($size) { gap: var(--spacing-#{$size}); }
@mixin p($size) { padding: var(--spacing-#{$size}); }
@mixin px($size) { padding-left: var(--spacing-#{$size}); padding-right: var(--spacing-#{$size}); }
@mixin py($size) { padding-top: var(--spacing-#{$size}); padding-bottom: var(--spacing-#{$size}); }
@mixin m($size) { margin: var(--spacing-#{$size}); }
@mixin mx($size) { margin-left: var(--spacing-#{$size}); margin-right: var(--spacing-#{$size}); }
@mixin my($size) { margin-top: var(--spacing-#{$size}); margin-bottom: var(--spacing-#{$size}); }
```

#### 5.1.5 Tokens de Bordes y Sombras

```scss
// tokens/_borders.scss
:root {
  --border-width-thin: 1px;
  --border-width-medium: 2px;
  --border-width-thick: 4px;
  
  --border-radius-none: 0;
  --border-radius-sm: 0.25rem;    // 4px
  --border-radius-md: 0.375rem;   // 6px
  --border-radius-lg: 0.5rem;     // 8px
  --border-radius-xl: 0.75rem;    // 12px
  --border-radius-full: 9999px;
}

// tokens/_shadows.scss
:root {
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

// tokens/_animations.scss
:root {
  --duration-instant: 50ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 5.2 Catálogo de Componentes

#### 5.2.1 Átomos

| Componente | Descripción | Variantes |
|------------|-------------|-----------|
| `UiButton` | Botón interactivo | primary, secondary, ghost, danger × sm, md, lg |
| `UiInput` | Campo de entrada de texto | default, error, disabled |
| `UiBadge` | Etiqueta/badge | info, success, warning, error |
| `UiIcon` | Iconos SVG | Librería de iconos (Lucide/Heroicons) |
| `UiSpinner` | Indicador de carga | sm, md, lg |
| `UiCheckbox` | Checkbox | default, disabled |
| `UiToggle` | Switch toggle | default, disabled |
| `UiAvatar` | Avatar/imagen de usuario | sm, md, lg |

#### 5.2.2 Moléculas

| Componente | Descripción | Compuesto por |
|------------|-------------|---------------|
| `UiSearchInput` | Input con icono de búsqueda | Input + Icon + Button (clear) |
| `UiSelect` | Dropdown de selección simple | Input + Dropdown + Options |
| `UiMultiSelect` | Dropdown de selección múltiple | Input + Dropdown + Checkboxes |
| `UiPagination` | Controles de paginación | Buttons + Text |
| `UiToast` | Notificación toast | Icon + Text + Button (dismiss) |
| `UiModal` | Ventana modal | Overlay + Card + Buttons |
| `UiCard` | Contenedor card | Header + Body + Footer |
| `UiEmptyState` | Estado vacío | Icon + Text + Button |

#### 5.2.3 Organismos

| Componente | Descripción | Compuesto por |
|------------|-------------|---------------|
| `UiDataTable` | Tabla de datos genérica | Table + Pagination + EmptyState |
| `UiFilterPanel` | Panel de filtros | SearchInput + Selects + Buttons |
| `UiHeader` | Cabecera de la app | Logo + Nav + ThemeToggle |
| `UiFooter` | Pie de página | Links + Copyright |

---

## 6. Storybook

### 6.1 Propósito

Storybook sirve como:

1. **Documentación viva:** Catálogo interactivo de todos los componentes
2. **Desarrollo aislado:** Desarrollar componentes sin depender de la app
3. **Testing visual:** Verificar estados y variantes de cada componente
4. **Playground:** Permitir explorar y probar componentes con diferentes props
5. **Guía de estilo:** Referencia para diseñadores y desarrolladores

### 6.2 Configuración

```
apps/web-client/
├── .storybook/
│   ├── main.ts              # Configuración principal
│   ├── preview.ts           # Configuración global de stories
│   └── manager.ts           # Personalización del UI de Storybook
│
└── src/
    └── app/
        └── shared/
            └── ui/
                └── atoms/
                    └── button/
                        ├── button.component.ts
                        └── button.stories.ts    # Stories del componente
```

#### 6.2.1 Configuración Principal

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',           // Accesibilidad
    '@storybook/addon-interactions',    // Testing de interacciones
    '@chromatic-com/storybook',         // Visual testing (opcional)
  ],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../src/assets'],
};

export default config;
```

#### 6.2.2 Configuración de Preview

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';

import '../src/styles/styles.scss';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' } },
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
```

### 6.3 Estructura de Stories

#### 6.3.1 Ejemplo: Button Stories

```typescript
// shared/ui/atoms/button/button.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { UiButtonComponent } from './button.component';

const meta: Meta<UiButtonComponent> = {
  title: 'Atoms/Button',
  component: UiButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
      description: 'Estilo visual del botón',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del botón',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Estado deshabilitado',
    },
    loading: {
      control: 'boolean',
      description: 'Estado de carga',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Ancho completo del contenedor',
    },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    fullWidth: false,
  },
};

export default meta;
type Story = StoryObj<UiButtonComponent>;

// Historia por defecto
export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `<ui-button [variant]="variant" [size]="size" [disabled]="disabled" [loading]="loading">
      Botón
    </ui-button>`,
  }),
};

// Variantes
export const Primary: Story = {
  args: { variant: 'primary' },
  render: (args) => ({
    props: args,
    template: `<ui-button variant="primary">Primary Button</ui-button>`,
  }),
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
  render: (args) => ({
    props: args,
    template: `<ui-button variant="secondary">Secondary Button</ui-button>`,
  }),
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
  render: (args) => ({
    props: args,
    template: `<ui-button variant="ghost">Ghost Button</ui-button>`,
  }),
};

export const Danger: Story = {
  args: { variant: 'danger' },
  render: (args) => ({
    props: args,
    template: `<ui-button variant="danger">Danger Button</ui-button>`,
  }),
};

// Tamaños
export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <ui-button size="sm">Small</ui-button>
        <ui-button size="md">Medium</ui-button>
        <ui-button size="lg">Large</ui-button>
      </div>
    `,
  }),
};

// Estados
export const Loading: Story = {
  args: { loading: true },
  render: (args) => ({
    props: args,
    template: `<ui-button [loading]="loading">Loading...</ui-button>`,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => ({
    props: args,
    template: `<ui-button [disabled]="disabled">Disabled</ui-button>`,
  }),
};

// Todos los variantes juntos
export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; gap: 1rem;">
          <ui-button variant="primary">Primary</ui-button>
          <ui-button variant="secondary">Secondary</ui-button>
          <ui-button variant="ghost">Ghost</ui-button>
          <ui-button variant="danger">Danger</ui-button>
        </div>
        <div style="display: flex; gap: 1rem;">
          <ui-button variant="primary" [disabled]="true">Disabled</ui-button>
          <ui-button variant="primary" [loading]="true">Loading</ui-button>
        </div>
      </div>
    `,
  }),
};
```

### 6.4 Organización de Stories

```
Storybook
├── 📁 Design System
│   ├── 📄 Introduction          # Introducción al design system
│   ├── 📄 Colors                # Paleta de colores
│   ├── 📄 Typography            # Tipografía
│   └── 📄 Spacing               # Sistema de espaciado
│
├── 📁 Atoms
│   ├── 📄 Button
│   ├── 📄 Input
│   ├── 📄 Badge
│   ├── 📄 Icon
│   ├── 📄 Spinner
│   ├── 📄 Checkbox
│   └── 📄 Toggle
│
├── 📁 Molecules
│   ├── 📄 SearchInput
│   ├── 📄 Select
│   ├── 📄 MultiSelect
│   ├── 📄 Pagination
│   ├── 📄 Toast
│   ├── 📄 Modal
│   └── 📄 Card
│
├── 📁 Organisms
│   ├── 📄 DataTable
│   ├── 📄 FilterPanel
│   ├── 📄 Header
│   └── 📄 Footer
│
└── 📁 Features
    ├── 📄 BookSearch
    └── 📄 BookDetail
```

### 6.5 Scripts npm

```json
// package.json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build -o dist/storybook",
    "storybook:test": "test-storybook"
  }
}
```

---

## 7. Diseño UI/UX

### 7.1 Sistema de Temas

#### 7.1.1 Variables CSS

```scss
// _themes.scss
:root {
  // Tema Light
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-accent: #3b82f6;
  --color-border: #e0e0e0;
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
}

[data-theme="dark"] {
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #2d2d2d;
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0a0;
  --color-accent: #60a5fa;
  --color-border: #404040;
  --color-success: #4ade80;
  --color-error: #f87171;
  --color-warning: #fbbf24;
}
```

#### 7.1.2 Theme Service

```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'library-theme';
  
  theme = signal<'light' | 'dark'>(this.getInitialTheme());
  
  toggleTheme(): void {
    const newTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(this.STORAGE_KEY, newTheme);
  }
  
  private getInitialTheme(): 'light' | 'dark' {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) return stored as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
```

### 7.2 Responsive Design

#### 7.2.1 Breakpoints

```scss
// _variables.scss
$breakpoints: (
  'mobile': 320px,
  'tablet': 768px,
  'desktop': 1024px,
  'wide': 1440px
);

@mixin respond-to($breakpoint) {
  @media (min-width: map-get($breakpoints, $breakpoint)) {
    @content;
  }
}
```

#### 7.2.2 Adaptaciones Mobile

| Elemento | Desktop | Mobile |
|----------|---------|--------|
| Tabla de libros | Tabla completa con todas las columnas | Tabla reducida o cards |
| Filtros | Inline horizontal | Colapsables en panel |
| Header | Logo + navegación | Logo + menú hamburguesa |
| Detalle libro | Layout 2 columnas | Layout 1 columna stack |

---

## 8. Gestión de Estado

### 8.1 Arquitectura de Signals

```typescript
// Patrón: Feature Store con Signals
// book-search/services/book-search.store.ts

@Injectable()
export class BookSearchStore {
  // State
  private readonly _books = signal<Book[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _filters = signal<SearchFilters>(defaultFilters);
  private readonly _pagination = signal<PaginationInfo>({ hasMore: false });
  
  // Public readonly signals
  readonly books = this._books.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  
  // Computed
  readonly isEmpty = computed(() => 
    this._books().length === 0 && !this._loading()
  );
  readonly totalResults = computed(() => this._books().length);
  
  // Actions
  async search(filters: SearchFilters): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    this._filters.set(filters);
    
    try {
      const response = await this.bookService.search(filters);
      this._books.set(response.data);
      this._pagination.set(response.pagination);
    } catch (error) {
      this._error.set(this.handleError(error));
    } finally {
      this._loading.set(false);
    }
  }
  
  async loadMore(): Promise<void> {
    // Implementación paginación cursor
  }
  
  resetFilters(): void {
    this._filters.set(defaultFilters);
    this.search(defaultFilters);
  }
}
```

### 8.2 Comunicación entre Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     BookSearchPage                           │
│                          │                                   │
│           ┌──────────────┴──────────────┐                   │
│           ▼                              ▼                   │
│  ┌─────────────────┐           ┌─────────────────┐          │
│  │SearchFilters    │           │ BookTable       │          │
│  │                 │           │                 │          │
│  │ (filtersChange) │──────────▶│ [books]         │          │
│  │      ▲          │           │ (bookSelected)  │──────┐   │
│  │      │          │           │ (loadMore)      │      │   │
│  └──────┼──────────┘           └─────────────────┘      │   │
│         │                                                │   │
│         │         ┌──────────────────────────────────────┘   │
│         │         ▼                                          │
│         │   Navigate to /books/:id                           │
│         │                                                    │
│   BookSearchStore (Signals)                                  │
│   - books, filters, loading, error                           │
│   - search(), loadMore(), resetFilters()                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Integración con API

### 9.1 API Service

```typescript
// core/services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = inject(ENVIRONMENT).apiUrl;
  private readonly http = inject(HttpClient);
  
  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params });
  }
  
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }
}
```

### 9.2 Book Service

```typescript
// core/services/book.service.ts
@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly api = inject(ApiService);
  
  search(filters: SearchFilters): Observable<SearchBooksResponse> {
    const params = this.buildSearchParams(filters);
    return this.api.get<SearchBooksResponse>('/api/books', params);
  }
  
  getById(id: string): Observable<Book> {
    return this.api.get<Book>(`/api/books/${id}`);
  }
  
  getTypes(): Observable<BookType[]> {
    return this.api.get<{ data: BookType[] }>('/api/books/types')
      .pipe(map(res => res.data));
  }
  
  getCategories(): Observable<Category[]> {
    return this.api.get<{ data: Category[] }>('/api/categories')
      .pipe(map(res => res.data));
  }
  
  getLevels(): Observable<Level[]> {
    return this.api.get<{ data: Level[] }>('/api/books/levels')
      .pipe(map(res => res.data));
  }
  
  sendToKindle(bookId: string, email: string): Observable<SendToKindleResponse> {
    return this.api.post<SendToKindleResponse>(
      `/api/books/${bookId}/send-to-kindle`,
      { email }
    );
  }
}
```

### 9.3 Error Handling

```typescript
// core/interceptors/error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Ha ocurrido un error inesperado';
      
      if (error.status === 0) {
        message = 'No se puede conectar con el servidor';
      } else if (error.status === 404) {
        message = 'Recurso no encontrado';
      } else if (error.status >= 500) {
        message = 'Error del servidor. Intente más tarde';
      } else if (error.error?.message) {
        message = error.error.message;
      }
      
      // Notificar al usuario (toast/snackbar)
      inject(NotificationService).error(message);
      
      return throwError(() => ({ status: error.status, message }));
    })
  );
};
```

---

## 10. Testing

### 10.1 Estrategia

| Nivel | Herramienta | Cobertura | Responsabilidad |
|-------|-------------|-----------|-----------------|
| Unit | Vitest + Angular Testing Library | 100% | Lógica de componentes, services, stores |
| Integration | Vitest | 80% | Interacción entre componentes |
| E2E | Playwright | Flujos críticos | Búsqueda, detalle, envío Kindle |

### 10.2 Estructura de Tests

```
tests/
├── unit/
│   ├── core/
│   │   └── services/
│   │       ├── book.service.spec.ts
│   │       └── theme.service.spec.ts
│   ├── features/
│   │   ├── book-search/
│   │   │   ├── book-search.store.spec.ts
│   │   │   ├── search-filters.component.spec.ts
│   │   │   └── book-table.component.spec.ts
│   │   └── book-detail/
│   │       ├── book-detail.page.spec.ts
│   │       └── send-to-kindle-form.component.spec.ts
│   └── shared/
│       └── components/
│           └── ...
├── integration/
│   └── features/
│       ├── book-search.integration.spec.ts
│       └── book-detail.integration.spec.ts
└── e2e/
    ├── book-search.spec.ts
    ├── book-detail.spec.ts
    └── send-to-kindle.spec.ts
```

### 10.3 Ejemplo Test Unitario

```typescript
// book-search.store.spec.ts
describe('BookSearchStore', () => {
  let store: BookSearchStore;
  let bookServiceMock: MockProxy<BookService>;
  
  beforeEach(() => {
    bookServiceMock = mock<BookService>();
    TestBed.configureTestingModule({
      providers: [
        BookSearchStore,
        { provide: BookService, useValue: bookServiceMock }
      ]
    });
    store = TestBed.inject(BookSearchStore);
  });
  
  describe('search', () => {
    it('should set loading to true while searching', async () => {
      bookServiceMock.search.mockReturnValue(of({ data: [], pagination: { hasMore: false } }));
      
      const searchPromise = store.search({});
      
      expect(store.loading()).toBe(true);
      await searchPromise;
      expect(store.loading()).toBe(false);
    });
    
    it('should update books with search results', async () => {
      const mockBooks = [createMockBook(), createMockBook()];
      bookServiceMock.search.mockReturnValue(of({ 
        data: mockBooks, 
        pagination: { hasMore: false } 
      }));
      
      await store.search({});
      
      expect(store.books()).toEqual(mockBooks);
    });
    
    it('should set error when search fails', async () => {
      bookServiceMock.search.mockReturnValue(throwError(() => new Error('Network error')));
      
      await store.search({});
      
      expect(store.error()).toBeTruthy();
      expect(store.books()).toEqual([]);
    });
  });
});
```

### 10.4 Ejemplo Test E2E

```typescript
// book-search.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test.describe('Book Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('should display search results when searching by title', async ({ page }) => {
    await page.getByPlaceholder('Buscar por título').fill('Clean Code');
    await page.getByRole('button', { name: 'Buscar' }).click();
    
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('Clean Code')).toBeVisible();
  });
  
  test('should filter by book type', async ({ page }) => {
    await page.getByLabel('Tipo').click();
    await page.getByRole('option', { name: 'Técnico' }).click();
    
    const rows = page.getByRole('row');
    await expect(rows).toHaveCountGreaterThan(0);
  });
  
  test('should navigate to book detail when clicking a row', async ({ page }) => {
    await page.getByRole('row').first().click();
    
    await expect(page).toHaveURL(/\/books\/[\w-]+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
  
  test('should paginate results', async ({ page }) => {
    await page.getByRole('button', { name: 'Cargar más' }).click();
    
    const rows = page.getByRole('row');
    await expect(rows).toHaveCountGreaterThan(20);
  });
});
```

---

## 11. Configuración y Despliegue

### 11.1 Estructura Docker

```dockerfile
# apps/web-client/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/web-client/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 11.2 Configuración Nginx

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (si están en el mismo host)
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 11.3 Docker Compose (actualización)

```yaml
# Añadir a docker-compose.yml
services:
  web-client:
    build:
      context: ./apps/web-client
      dockerfile: Dockerfile
    container_name: library-web-client
    ports:
      - "4200:80"
    depends_on:
      - api
    networks:
      - library-network
```

### 11.4 Variables de Entorno

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};

// environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api'  // Proxy via nginx
};
```

---

## 12. Rutas de la Aplicación

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `BookSearchPage` | Página principal con búsqueda |
| `/books/:id` | `BookDetailPage` | Detalle de libro |

---

## 13. Decisiones de Diseño

### 13.1 ¿Por qué Signals en lugar de NgRx?

- **Simplicidad:** La aplicación tiene un estado relativamente simple (búsqueda + detalle)
- **Performance:** Signals son más eficientes para granularidad fina de cambios
- **Bundle size:** No añade dependencias externas
- **Futuro de Angular:** Signals son la dirección oficial del framework

### 13.2 ¿Por qué Vitest en lugar de Jest/Karma?

- **Velocidad:** Vitest es significativamente más rápido
- **Consistencia:** Ya se usa Vitest en el backend
- **ESM nativo:** Mejor soporte para módulos ES
- **HMR en tests:** Desarrollo más ágil

### 13.3 ¿Por qué Playwright en lugar de Cypress?

- **Multi-browser:** Soporte nativo para Chrome, Firefox, Safari
- **Performance:** Más rápido en ejecución
- **Paralelización:** Mejor soporte para tests en paralelo
- **Menor footprint:** No requiere browser embebido

### 13.4 ¿Por qué Design System propio en lugar de Angular Material/PrimeNG?

- **Coherencia total:** Control absoluto sobre el diseño visual sin restricciones de librerías externas
- **Bundle size mínimo:** Solo el código que realmente necesitamos, sin overhead
- **Aprendizaje:** Mejor comprensión de los patrones de componentización y CSS
- **Personalización:** Libertad para implementar exactamente lo que necesita la aplicación
- **Mantenibilidad:** No dependemos de breaking changes de librerías UI externas
- **Alcance limitado:** La aplicación tiene pocas pantallas y componentes, un design system propio es viable

### 13.5 ¿Por qué Storybook?

- **Desarrollo aislado:** Permite crear componentes sin depender del contexto de la app
- **Documentación viva:** Catálogo interactivo que sirve de referencia para el equipo
- **Testing visual:** Fácil verificación de estados, variantes y edge cases
- **Consistencia:** Garantiza que todos los componentes siguen las mismas convenciones
- **Onboarding:** Nuevo desarrollador puede explorar los componentes disponibles rápidamente
- **Design System:** Documenta tokens, colores, tipografía junto a los componentes

---

## 14. Roadmap de Implementación

### Fase 1: Setup y Estructura Base
1. Inicializar proyecto Angular 19
2. Configurar ESLint, Prettier, Vitest, Playwright
3. Configurar Storybook 8.x
4. Crear estructura de Design Tokens (colores, tipografía, espaciado)
5. Implementar sistema de temas (dark/light)
6. Crear layout principal (header, footer)
7. Configurar routing y lazy loading

### Fase 2: Design System y Componentes Base
1. Desarrollar átomos en Storybook (Button, Input, Badge, Icon, Spinner)
2. Desarrollar moléculas en Storybook (SearchInput, Select, MultiSelect, Pagination)
3. Desarrollar organismos en Storybook (DataTable, FilterPanel)
4. Documentar componentes con ejemplos y variantes
5. Tests unitarios para cada componente

### Fase 3: Feature Búsqueda
1. Implementar BookService (API integration)
2. Crear BookSearchStore (Signals)
3. Desarrollar SearchFiltersComponent (usando componentes del Design System)
4. Desarrollar BookTableComponent (usando UiDataTable)
5. Implementar paginación con cursor
6. Tests unitarios y de integración

### Fase 4: Feature Detalle
1. Implementar página de detalle
2. Crear BookInfoCardComponent
3. Desarrollar SendToKindleFormComponent
4. Implementar flujo de envío a Kindle
5. Tests unitarios y de integración

### Fase 5: Polish y E2E
1. Responsive design ajustes
2. Animaciones y transiciones
3. Tests E2E completos
4. Optimización de performance
5. Documentación final en Storybook

### Fase 6: Dockerización
1. Crear Dockerfile
2. Configurar nginx
3. Actualizar docker-compose
4. Tests en entorno containerizado

---

## 15. Apéndices

### A. Modelos de Dominio

```typescript
// core/models/book.model.ts
export interface Book {
  id: string;
  title: string;
  authors: Author[];
  description: string;
  originalDescription?: string;
  type: BookType;
  categories: Category[];
  level?: Level;
  formats: BookFormat[];
  isbn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Author {
  id: string;
  name: string;
}

export interface BookType {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Level {
  id: string;
  name: string;
  description?: string;
}

export type BookFormat = 'PDF' | 'EPUB' | 'MOBI' | 'AZW3';
```

### B. Endpoints API Requeridos

| Método | Endpoint | Estado |
|--------|----------|--------|
| GET | `/api/books` | ✅ Implementado |
| GET | `/api/books/:id` | ❌ Pendiente |
| GET | `/api/books/types` | ✅ Implementado |
| GET | `/api/books/levels` | ✅ Implementado |
| GET | `/api/categories` | ✅ Implementado |
| POST | `/api/books/:id/send-to-kindle` | ❌ Pendiente (fuera de alcance) |

---

## 16. Referencias

- [Angular 19 Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
