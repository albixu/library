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
| UI Components | Angular Material | 19.x |
| Estilos | SCSS + CSS Variables | - |
| HTTP Client | Angular HttpClient | Built-in |
| Routing | Angular Router | Built-in |
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
│   │   ├── components/          # Componentes reutilizables (wrappers de Material)
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
│   └── flags/                   # Banderas ISO para idiomas
│
├── styles/                      # Estilos globales
│   ├── _variables.scss          # Variables CSS/SCSS
│   ├── _themes.scss             # Definición de temas (dark/light)
│   ├── _typography.scss         # Tipografía (Inter)
│   ├── _material-theme.scss     # Tema personalizado de Angular Material
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
│  │   │  │    SemanticSearchComponent (Textarea)   │    │   │    │
│  │   │  └─────────────────────────────────────────┘    │   │    │
│  │   │  ┌─────────────────────────────────────────┐    │   │    │
│  │   │  │      FilterPanelComponent (Sidenav)     │    │   │    │
│  │   │  │  [Type] [Category] [Level] [Author]     │    │   │    │
│  │   │  └─────────────────────────────────────────┘    │   │    │
│  │   │  ┌─────────────────────────────────────────┐    │   │    │
│  │   │  │         BookTableComponent               │    │   │    │
│  │   │  │  ┌─────┬────────┬────────┬─────┬─────┐  │    │   │    │
│  │   │  │  │Title│ Author │  Type  │Level│Lang │  │    │   │    │
│  │   │  │  ├─────┼────────┼────────┼─────┼─────┤  │    │   │    │
│  │   │  │  │ ... │  ...   │  ...   │ ... │ 🇬🇧  │  │    │   │    │
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

| Componente | Responsabilidad | Componente Material |
|------------|-----------------|---------------------|
| `BookSearchPage` | Página contenedora, orquesta la búsqueda | `mat-sidenav-container` |
| `SemanticSearchComponent` | Textarea para búsqueda en lenguaje natural | `mat-form-field` + `textarea` |
| `FilterPanelComponent` | Panel lateral de filtros | `mat-sidenav`, `mat-select`, `mat-chip` |
| `BookTableComponent` | Tabla de resultados con paginación | `mat-table`, `mat-paginator` |

#### 3.1.3 Filtros Disponibles

| Filtro | Tipo | Componente Material |
|--------|------|---------------------|
| Texto (semántico) | Textarea | `mat-form-field` con textarea expandible |
| Título | Input text | `mat-form-field` |
| Autor | Input text | `mat-form-field` |
| Tipo | Select múltiple | `mat-select` con `multiple` |
| Categoría | Select múltiple | `mat-select` con `multiple` |
| Nivel | Select | `mat-select` |

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

| Componente | Responsabilidad | Componente Material |
|------------|-----------------|---------------------|
| `BookDetailPage` | Página contenedora | Layout con `mat-card` |
| `BookInfoCardComponent` | Muestra información del libro | `mat-card` |
| `SendToKindleFormComponent` | Formulario para enviar a Kindle | `mat-form-field`, `mat-button` |
| `SendToKindleDialogComponent` | Modal de confirmación/resultado | `mat-dialog` |

#### 3.2.3 Información Mostrada

- Título
- Autor(es)
- Descripción (traducida al español)
- Tipo de libro
- Categorías
- Nivel
- Formato(s) disponibles
- ISBN (si existe)
- Idioma original (con bandera ISO)

#### 3.2.4 Flujo Envío a Kindle

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ Usuario hace │────▶│ Dialog solicita   │────▶│ Validación email │
│ click "Enviar│     │ email Kindle      │     │ formato válido   │
│ a Kindle"    │     │ (@kindle.com)     │     │                  │
└──────────────┘     └───────────────────┘     └────────┬─────────┘
                                                        │
                     ┌───────────────────┐              │
                     │ Confirmación      │◀─────────────┘
                     │ "Enviando..."     │
                     │ [mat-spinner]     │
                     └────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │ Success  │   │  Error   │   │ Error:       │
        │ Snackbar │   │ Snackbar │   │ "Formato no  │
        │ "Enviado"│   │ Reintentar│  │ compatible"  │
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

## 4. Angular Material Integration

### 4.1 Módulos Utilizados

```typescript
// Módulos de Angular Material utilizados
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
```

### 4.2 Mapeo de Componentes

| Necesidad UI | Componente Material |
|--------------|---------------------|
| Botones (primary, secondary) | `mat-button`, `mat-raised-button`, `mat-flat-button` |
| Inputs y formularios | `mat-form-field`, `matInput` |
| Selects y multiselects | `mat-select` con `mat-option` |
| Tabla de datos | `mat-table` con `mat-sort` |
| Paginación | `mat-paginator` |
| Cards/Tarjetas | `mat-card` |
| Modales/Dialogs | `mat-dialog` |
| Notificaciones | `mat-snack-bar` |
| Iconos | `mat-icon` (Material Icons) |
| Loading spinners | `mat-spinner`, `mat-progress-spinner` |
| Panel lateral | `mat-sidenav` |
| Header/Toolbar | `mat-toolbar` |
| Toggle dark/light | `mat-slide-toggle` |
| Chips/Tags | `mat-chip` |

---

## 5. Guía de Estilos

Esta guía define la identidad visual del gestor de libros digitales, asegurando consistencia en todas las pantallas presentes y futuras.

### 5.1 Paleta de Colores

#### 5.1.1 Modo Oscuro (Dark Mode)

Diseñado para reducir la fatiga visual en entornos de poca luz, utilizando una jerarquía de profundidades.

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg-primary` | `#0f172a` | Fondo principal (azul medianoche profundo) |
| `--color-bg-surface` | `#1e293b` | Superficies/tarjetas (azul grisáceo oscuro) |
| `--color-accent` | `#17a1cf` | Color primario (cian vibrante) - botones, estados activos |
| `--color-text-primary` | `#f8fafc` | Texto principal (blanco casi puro) |
| `--color-text-secondary` | `#94a3b8` | Texto secundario (gris azulado suave) |
| `--color-border` | `#334155` | Bordes sutiles |
| `--color-success` | `#10b981` | Estado disponible (verde esmeralda con opacidad) |
| `--color-warning` | `#f59e0b` | Estado prestado/reservado (ámbar atenuado) |
| `--color-error` | `#ef4444` | Errores (rojo atenuado) |

#### 5.1.2 Modo Claro (Light Mode)

Enfocado en la claridad, limpieza y una sensación de papel digital minimalista.

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg-primary` | `#f8fafc` | Fondo principal (blanco grisáceo muy tenue) |
| `--color-bg-surface` | `#ffffff` | Superficies/tarjetas (blanco puro) con sombras sutiles |
| `--color-accent` | `#17a1cf` | Color primario (cian ajustado para contraste) |
| `--color-text-primary` | `#0f172a` | Texto principal (azul oscuro profundo) |
| `--color-text-secondary` | `#64748b` | Texto secundario (gris medio) |
| `--color-border` | `#e2e8f0` | Bordes (gris muy claro) |
| `--color-success` | `#10b981` | Estado disponible |
| `--color-warning` | `#f59e0b` | Estado prestado/reservado |
| `--color-error` | `#ef4444` | Errores |

### 5.2 Implementación de Temas

#### 5.2.1 Variables CSS

```scss
// styles/_themes.scss

// ═══════════════════════════════════════════════════════════════
// TEMA CLARO (Light Mode) - Por defecto
// Sensación de papel digital minimalista
// ═══════════════════════════════════════════════════════════════
:root {
  // Backgrounds
  --color-bg-primary: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #ffffff;
  
  // Text
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  
  // Accent (Cian vibrante)
  --color-accent: #17a1cf;
  --color-accent-hover: #1490ba;
  --color-accent-light: rgba(23, 161, 207, 0.1);
  
  // Borders
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  
  // Semantic
  --color-success: #10b981;
  --color-success-bg: rgba(16, 185, 129, 0.1);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-error: #ef4444;
  --color-error-bg: rgba(239, 68, 68, 0.1);
  
  // Shadows (Light mode usa sombras sutiles)
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

// ═══════════════════════════════════════════════════════════════
// TEMA OSCURO (Dark Mode)
// Reduce fatiga visual con jerarquía de profundidades
// ═══════════════════════════════════════════════════════════════
[data-theme="dark"] {
  // Backgrounds (jerarquía de profundidades)
  --color-bg-primary: #0f172a;      // Azul medianoche profundo
  --color-bg-surface: #1e293b;      // Azul grisáceo oscuro (elevado)
  --color-bg-elevated: #334155;     // Más elevado aún
  
  // Text
  --color-text-primary: #f8fafc;    // Blanco casi puro
  --color-text-secondary: #94a3b8;  // Gris azulado suave
  --color-text-muted: #64748b;
  
  // Accent (Mismo cian, mantiene identidad)
  --color-accent: #17a1cf;
  --color-accent-hover: #38bdf8;
  --color-accent-light: rgba(23, 161, 207, 0.2);
  
  // Borders
  --color-border: #334155;
  --color-border-strong: #475569;
  
  // Semantic (tonos atenuados para dark mode)
  --color-success: #34d399;
  --color-success-bg: rgba(52, 211, 153, 0.15);
  --color-warning: #fbbf24;
  --color-warning-bg: rgba(251, 191, 36, 0.15);
  --color-error: #f87171;
  --color-error-bg: rgba(248, 113, 113, 0.15);
  
  // Shadows (Dark mode usa sombras más sutiles)
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
}
```

#### 5.2.2 Tema de Angular Material

```scss
// styles/_material-theme.scss
@use '@angular/material' as mat;

// Paleta personalizada basada en nuestro color de acento
$library-primary: mat.define-palette((
  50: #e6f7fc,
  100: #b3e8f7,
  200: #80d9f2,
  300: #4dcaed,
  400: #26bee9,
  500: #17a1cf,  // Color principal
  600: #1490ba,
  700: #107da1,
  800: #0c6a88,
  900: #064d63,
  contrast: (
    50: #0f172a,
    100: #0f172a,
    200: #0f172a,
    300: #0f172a,
    400: #ffffff,
    500: #ffffff,
    600: #ffffff,
    700: #ffffff,
    800: #ffffff,
    900: #ffffff,
  )
));

// Tema Light
$library-light-theme: mat.define-light-theme((
  color: (
    primary: $library-primary,
    accent: $library-primary,
  ),
  typography: mat.define-typography-config(
    $font-family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  ),
));

// Tema Dark
$library-dark-theme: mat.define-dark-theme((
  color: (
    primary: $library-primary,
    accent: $library-primary,
  ),
));

// Aplicar tema light por defecto
@include mat.all-component-themes($library-light-theme);

// Aplicar tema dark cuando está activo
[data-theme="dark"] {
  @include mat.all-component-colors($library-dark-theme);
}
```

### 5.3 Tipografía

**Fuente Principal:** Inter (Sans-Serif)

Inter está diseñada específicamente para pantallas de ordenador, con excelente legibilidad en tamaños pequeños (tablas de datos) y aspecto moderno en títulos grandes.

```scss
// styles/_typography.scss

// Font import
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

// Escala tipográfica
$typography-scale: (
  // Títulos
  'h1': (size: 2rem, weight: 600, line-height: 1.25),      // 32px, Semibold
  'h2': (size: 1.5rem, weight: 600, line-height: 1.3),     // 24px, Semibold
  'h3': (size: 1.25rem, weight: 500, line-height: 1.4),    // 20px, Medium
  'h4': (size: 1.125rem, weight: 500, line-height: 1.4),   // 18px, Medium
  
  // Cuerpo
  'body': (size: 1rem, weight: 400, line-height: 1.5),     // 16px, Regular
  'body-sm': (size: 0.875rem, weight: 400, line-height: 1.5), // 14px, Regular (tablas)
  'caption': (size: 0.75rem, weight: 400, line-height: 1.5),  // 12px, Regular
);

// Mixins de tipografía
@mixin typography($variant) {
  $config: map-get($typography-scale, $variant);
  font-size: map-get($config, 'size');
  font-weight: map-get($config, 'weight');
  line-height: map-get($config, 'line-height');
  font-family: var(--font-family-sans);
}

// Clases utilitarias
.text-h1 { @include typography('h1'); }
.text-h2 { @include typography('h2'); }
.text-h3 { @include typography('h3'); }
.text-h4 { @include typography('h4'); }
.text-body { @include typography('body'); }
.text-body-sm { @include typography('body-sm'); }
.text-caption { @include typography('caption'); }
```

### 5.4 Elementos de UI

#### 5.4.1 Redondez (Border Radius)

Se aplica un estándar de **8px** en tarjetas, botones e inputs para un aspecto moderno pero profesional.

```scss
:root {
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;      // Estándar principal
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}

// Aplicar a componentes Material
.mat-mdc-card {
  border-radius: var(--radius-md) !important;
}

.mat-mdc-button,
.mat-mdc-raised-button,
.mat-mdc-flat-button {
  border-radius: var(--radius-md) !important;
}

.mat-mdc-form-field {
  .mdc-text-field {
    border-radius: var(--radius-md) !important;
  }
}
```

#### 5.4.2 Iconografía

- **Estilo:** Lineal minimalista (Material Icons Outlined)
- **Banderas ISO:** Para representar idiomas sin necesidad de texto extra

```typescript
// Uso de banderas ISO para idiomas
interface LanguageFlag {
  code: string;     // ISO 639-1
  flag: string;     // Emoji o imagen
  name: string;     // Nombre del idioma
}

const languageFlags: LanguageFlag[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
];
```

#### 5.4.3 Interactividad

| Elemento | Desktop/Tablet | Mobile |
|----------|----------------|--------|
| Panel de filtros | Sidenav persistente | Sidenav colapsable (hamburguesa) |
| Búsqueda semántica | Textarea destacado (expandible) | Full-width |
| Toggle de modo | En header, acceso rápido | En header |
| Tabla de resultados | Tabla completa con sort | Tabla simplificada o cards |

### 5.5 Espaciado

```scss
// Escala de espaciado (base 4px)
:root {
  --spacing-0: 0;
  --spacing-1: 0.25rem;    // 4px
  --spacing-2: 0.5rem;     // 8px
  --spacing-3: 0.75rem;    // 12px
  --spacing-4: 1rem;       // 16px
  --spacing-5: 1.25rem;    // 20px
  --spacing-6: 1.5rem;     // 24px
  --spacing-8: 2rem;       // 32px
  --spacing-10: 2.5rem;    // 40px
  --spacing-12: 3rem;      // 48px
  --spacing-16: 4rem;      // 64px
}
```

### 5.6 Breakpoints (Responsive)

```scss
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

// Adaptaciones responsive
@mixin mobile-only {
  @media (max-width: 767px) {
    @content;
  }
}

@mixin tablet-up {
  @media (min-width: 768px) {
    @content;
  }
}

@mixin desktop-up {
  @media (min-width: 1024px) {
    @content;
  }
}
```

### 5.7 Estados Visuales

```scss
// Estados de disponibilidad de libros
.status-available {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.status-borrowed {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-reserved {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-unavailable {
  background-color: var(--color-error-bg);
  color: var(--color-error);
}
```

---

## 6. Sistema de Temas

### 6.1 Theme Service

```typescript
// core/services/theme.service.ts
import { Injectable, signal, effect } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'library-theme';
  
  readonly theme = signal<Theme>(this.getInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');
  
  constructor() {
    // Sync with DOM
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });
  }
  
  toggleTheme(): void {
    const newTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
    localStorage.setItem(this.STORAGE_KEY, newTheme);
  }
  
  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }
  
  private getInitialTheme(): Theme {
    // 1. Check localStorage
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored) return stored;
    
    // 2. Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // 3. Default to light
    return 'light';
  }
}
```

### 6.2 Toggle Component

```typescript
// shared/components/theme-toggle/theme-toggle.component.ts
import { Component, inject } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatSlideToggleModule, MatIconModule],
  template: `
    <button 
      mat-icon-button 
      (click)="themeService.toggleTheme()"
      [attr.aria-label]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    >
      <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
```

---

## 7. Gestión de Estado

### 7.1 Arquitectura de Signals

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

### 7.2 Comunicación entre Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     BookSearchPage                           │
│                          │                                   │
│           ┌──────────────┴──────────────┐                   │
│           ▼                              ▼                   │
│  ┌─────────────────┐           ┌─────────────────┐          │
│  │FilterPanel      │           │ BookTable       │          │
│  │ (mat-sidenav)   │           │ (mat-table)     │          │
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

## 8. Integración con API

### 8.1 API Service

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

### 8.2 Book Service

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
    return this.api.get<{ data: BookType[] }>('/api/book-types')
      .pipe(map(res => res.data));
  }
  
  getCategories(typeId?: string): Observable<Category[]> {
    const params = typeId ? new HttpParams().set('typeId', typeId) : undefined;
    return this.api.get<{ data: Category[] }>('/api/book-categories', params)
      .pipe(map(res => res.data));
  }
  
  getLevels(typeId?: string): Observable<Level[]> {
    const params = typeId ? new HttpParams().set('typeId', typeId) : undefined;
    return this.api.get<{ data: Level[] }>('/api/book-levels', params)
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

### 8.3 Error Handling

```typescript
// core/interceptors/error.interceptor.ts
import { MatSnackBar } from '@angular/material/snack-bar';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  
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
      
      // Notificar al usuario con Snackbar de Material
      snackBar.open(message, 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      
      return throwError(() => ({ status: error.status, message }));
    })
  );
};
```

---

## 9. Testing

### 9.1 Estrategia

| Nivel | Herramienta | Cobertura | Responsabilidad |
|-------|-------------|-----------|-----------------|
| Unit | Vitest + Angular Testing Library | 100% | Lógica de componentes, services, stores |
| Integration | Vitest | 80% | Interacción entre componentes |
| E2E | Playwright | Flujos críticos | Búsqueda, detalle, envío Kindle |

### 9.2 Estructura de Tests

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
│   │   │   ├── filter-panel.component.spec.ts
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

### 9.3 Ejemplo Test Unitario

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

### 9.4 Ejemplo Test E2E

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
    
    const rows = page.locator('mat-row');
    await expect(rows).toHaveCount({ greaterThan: 0 });
  });
  
  test('should navigate to book detail when clicking a row', async ({ page }) => {
    await page.locator('mat-row').first().click();
    
    await expect(page).toHaveURL(/\/books\/[\w-]+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
  
  test('should toggle theme', async ({ page }) => {
    // Default is light
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    
    // Toggle to dark
    await page.getByRole('button', { name: /modo oscuro/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    
    // Toggle back to light
    await page.getByRole('button', { name: /modo claro/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
```

---

## 10. Configuración y Despliegue

### 10.1 Estructura Docker

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

### 10.2 Configuración Nginx

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

### 10.3 Docker Compose

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

### 10.4 Variables de Entorno

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

## 11. Rutas de la Aplicación

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `BookSearchPage` | Página principal con búsqueda |
| `/books/:id` | `BookDetailPage` | Detalle de libro |

---

## 12. Decisiones de Diseño

### 12.1 ¿Por qué Angular Material?

- **Productividad:** Componentes listos para usar, reduciendo tiempo de desarrollo
- **Accesibilidad:** Componentes con ARIA y keyboard navigation incluidos
- **Theming:** Sistema de temas integrado que permite personalización completa
- **Mantenimiento:** Actualizaciones de seguridad y compatibilidad gestionadas por Google
- **Consistencia:** Diseño Material Design probado en millones de aplicaciones
- **Documentación:** Extensa documentación y ejemplos

### 12.2 ¿Por qué Signals en lugar de NgRx?

- **Simplicidad:** La aplicación tiene un estado relativamente simple (búsqueda + detalle)
- **Performance:** Signals son más eficientes para granularidad fina de cambios
- **Bundle size:** No añade dependencias externas
- **Futuro de Angular:** Signals son la dirección oficial del framework

### 12.3 ¿Por qué Vitest en lugar de Jest/Karma?

- **Velocidad:** Vitest es significativamente más rápido
- **Consistencia:** Ya se usa Vitest en el backend
- **ESM nativo:** Mejor soporte para módulos ES
- **HMR en tests:** Desarrollo más ágil

### 12.4 ¿Por qué Playwright en lugar de Cypress?

- **Multi-browser:** Soporte nativo para Chrome, Firefox, Safari
- **Performance:** Más rápido en ejecución
- **Paralelización:** Mejor soporte para tests en paralelo
- **Menor footprint:** No requiere browser embebido

### 12.5 ¿Por qué tema personalizado sobre Material?

Angular Material permite personalización completa manteniendo sus beneficios:

- **Colores propios:** Nuestro cian (#17a1cf) como acento principal
- **Tipografía Inter:** Mejor legibilidad que Roboto en tablas de datos
- **Dark mode propio:** Jerarquía de profundidades con azules oscuros
- **Redondez 8px:** Aspecto más moderno que los defaults de Material

---

## 13. Roadmap de Implementación

### Fase 1: Setup y Estructura Base
1. Inicializar proyecto Angular 19
2. Instalar y configurar Angular Material
3. Configurar ESLint, Prettier, Vitest, Playwright
4. Configurar tema personalizado de Material (colores, tipografía)
5. Implementar sistema de temas dark/light
6. Crear layout principal (mat-toolbar, mat-sidenav)
7. Configurar routing y lazy loading

### Fase 2: Feature Búsqueda
1. Implementar BookService (API integration)
2. Crear BookSearchStore (Signals)
3. Desarrollar FilterPanelComponent (mat-sidenav, mat-select)
4. Desarrollar SemanticSearchComponent (mat-form-field + textarea)
5. Desarrollar BookTableComponent (mat-table, mat-paginator, mat-sort)
6. Implementar paginación con cursor
7. Tests unitarios y de integración

### Fase 3: Feature Detalle
1. Implementar página de detalle (mat-card)
2. Crear BookInfoCardComponent
3. Desarrollar SendToKindleFormComponent (mat-form-field, mat-button)
4. Implementar SendToKindleDialog (mat-dialog)
5. Integrar mat-snackbar para notificaciones
6. Tests unitarios y de integración

### Fase 4: Polish y E2E
1. Responsive design ajustes (mat-sidenav colapsable en mobile)
2. Animaciones y transiciones
3. Tests E2E completos
4. Optimización de performance
5. Accesibilidad review

### Fase 5: Dockerización
1. Crear Dockerfile
2. Configurar nginx
3. Actualizar docker-compose
4. Tests en entorno containerizado

---

## 14. Apéndices

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
  language: string;
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
  typeId: string;
}

export interface Level {
  id: string;
  name: string;
  typeId: string;
}

export type BookFormat = 'pdf' | 'epub' | 'mobi' | 'azw3';
```

### B. Endpoints API Requeridos

| Método | Endpoint | Estado |
|--------|----------|--------|
| GET | `/api/books` | ✅ Implementado |
| GET | `/api/books/:id` | ❌ Pendiente |
| GET | `/api/book-types` | ✅ Implementado |
| GET | `/api/book-categories` | ✅ Implementado |
| GET | `/api/book-levels` | ✅ Implementado |
| POST | `/api/books/:id/send-to-kindle` | ❌ Pendiente (fuera de alcance) |

---

## 15. Referencias

- [Angular 19 Documentation](https://angular.dev)
- [Angular Material](https://material.angular.io)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Material Design Guidelines](https://m3.material.io)
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Inter Font](https://rsms.me/inter/)
