# Design Doc: Web Client - Arquitectura y Sistema de Diseño

## Metadata

| Campo | Valor |
|-------|-------|
| **Estado** | Aprobado |
| **Fecha** | 2026-01-31 |
| **Última actualización** | 2026-03-06 (HU-032: Angular 21, Tailwind CSS — reemplaza Angular Material completo) |
| **Autor** | - |

> **Nota HU-020**: El web client fue migrado completamente de Angular Material a **Tailwind CSS** en HU-020. Este documento refleja el estado post-migración. El documento de referencia de la migración se encuentra en `05-migration-material-to-tailwind.md`.

---

## 1. Introducción

El Web Client es la interfaz de usuario del sistema **Library**. Es una **Single Page Application (SPA)** construida con Angular 21 que consume la API REST.

### Objetivos de diseño

- **Pixel-perfect**: Fidelidad total con los diseños aprobados (Figma/Stitch)
- **Rendimiento**: Time to Interactive < 3s en conexión 3G
- **Responsive**: Funcionamiento correcto en desktop y mobile
- **Mantenibilidad**: CSS predecible, sin luchas de especificidad
- **Dark/Light mode**: Soporte completo con persistencia en `localStorage`

---

## 2. Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Angular | 21.x |
| Lenguaje | TypeScript | 5.x |
| State Management | Angular Signals | Built-in |
| Estilos | **Tailwind CSS** | 3.x |
| Component Docs | Storybook | 8.x |
| Testing Unit | Vitest + Angular Testing Library | Latest |
| Testing E2E | Playwright | Latest |
| Build Tool | Angular CLI (esbuild) | 21.x |
| Servidor | Nginx (Docker) | alpine |

> **Angular Material ha sido eliminado completamente** (HU-020). No se usa ningún componente `mat-*`. Todo el sistema de UI está construido con Tailwind CSS y componentes propios.

---

## 3. Arquitectura de la Aplicación

### 3.1 Estructura de Features (Screaming Architecture)

La estructura sigue **Screaming Architecture**: los nombres de los directorios gritan lo que hace el sistema, no sus detalles técnicos.

```
src/app/
├── catalog/                 # 📚 FEATURE: Catálogo de libros (feature principal)
│   ├── components/
│   │   ├── data-display/    # Componentes de visualización de datos
│   │   │   ├── category-chips/
│   │   │   ├── format-icon/
│   │   │   ├── language-flag/
│   │   │   ├── level-badge/
│   │   │   └── truncated-text/
│   │   ├── dialogs/         # Diálogos modales
│   │   │   ├── book-description-dialog/
│   │   │   └── send-to-kindle-dialog/
│   │   ├── filters/         # Panel de filtros y búsqueda
│   │   │   ├── filter-panel/
│   │   │   ├── multi-select-chips/
│   │   │   ├── searchable-select/
│   │   │   ├── semantic-search/
│   │   │   └── text-filter-input/
│   │   └── table/           # Tabla y tarjetas de libros
│   │       ├── book-card/
│   │       ├── book-table/
│   │       ├── empty-state/
│   │       ├── loading-overlay/
│   │       └── paginator/
│   ├── pages/
│   │   └── book-list/       # Página principal del catálogo
│   └── services/
│       ├── book-catalog.store.ts  # Estado reactivo con Signals
│       └── book.service.ts        # Comunicación con la API
│
├── core/                    # 🔧 SERVICIOS SINGLETON
│   ├── services/
│   │   ├── api.service.ts   # Servicio base HTTP
│   │   └── theme.service.ts # Gestión dark/light mode
│   ├── interceptors/
│   │   └── error.interceptor.ts
│   └── models/              # Interfaces y tipos del dominio
│
├── kindle/                  # 📧 FEATURE: Envío a Kindle
│   ├── components/
│   └── services/
│
├── layout/                  # 📐 COMPONENTES DE LAYOUT
│   ├── header/
│   ├── footer/
│   └── main-layout/
│
└── shared/                  # 🛠️ UTILIDADES TRANSVERSALES
    ├── components/
    │   └── theme-toggle/
    ├── directives/
    ├── pipes/
    └── utils/
```

### 3.2 Principios de organización

- **Un directorio por responsabilidad**: `catalog/`, `kindle/`, `layout/`, `shared/`
- **Componentes standalone**: Todos los componentes son `standalone: true` (sin NgModules)
- **Lazy loading**: Cada feature se carga bajo demanda
- **Colocación**: Tests, stories y estilos al lado del componente

---

## 4. Sistema de Estilos: Tailwind CSS

### 4.1 Configuración del tema (`tailwind.config.js`)

El tema extiende Tailwind con los tokens de diseño del sistema:

```javascript
export default {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#17a1cf',
          hover: '#1493c0',
          active: '#1082ab',
        },
        background: {
          primary: '#f6f7f8',       // Light mode
          surface: '#ffffff',
          'dark-primary': '#111d21', // Dark mode
          'dark-surface': '#0f172a',
        },
        // ... colores semánticos (success, warning, error, info)
        // ... colores de level badges (beginner, intermediate, advanced, expert)
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
        dropdown: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
    },
  },
};
```

### 4.2 Modo oscuro

El modo oscuro se activa mediante el atributo `data-theme="dark"` en el elemento raíz:

```typescript
// theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'light' | 'dark'>(this.getInitialTheme());

  toggleTheme(): void {
    const newTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('library-theme', newTheme);
  }
}
```

En los componentes, se usa el prefijo `dark:` de Tailwind:

```html
<div class="bg-background-primary dark:bg-background-dark-primary text-gray-900 dark:text-white">
```

### 4.3 Convenciones de estilos

- **Utility-first**: Se prefieren las clases utilitarias de Tailwind directamente en los templates
- **`@apply` para repetición**: Sólo cuando un patrón se repite ≥3 veces en el mismo componente
- **Sin `!important`**: El sistema de Tailwind no requiere sobreescrituras con `!important`
- **Sin `::ng-deep`**: No se necesita perforar el encapsulamiento de Angular
- **Variables CSS para valores dinámicos**: Para valores que cambian en runtime (ej. colores calculados)

---

## 5. State Management con Angular Signals

Cada feature que necesita estado mantiene su propio store basado en Angular Signals.

### 5.1 Patrón de Store

```typescript
// catalog/services/book-catalog.store.ts
@Injectable()
export class BookCatalogStore {
  // Estado privado (readonly desde fuera)
  private readonly _books = signal<Book[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _totalCount = signal(0);

  // API pública (solo lectura)
  readonly books = this._books.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();

  // Valores computados
  readonly isEmpty = computed(() =>
    this._books().length === 0 && !this._loading()
  );
  readonly hasError = computed(() => this._error() !== null);

  constructor(private readonly bookService: BookService) {}

  async search(filters: SearchFilters): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const response = await this.bookService.search(filters);
      this._books.set(response.data);
      this._totalCount.set(response.pagination.total);
    } catch (err) {
      this._error.set(this.mapError(err));
    } finally {
      this._loading.set(false);
    }
  }
}
```

### 5.2 Uso en componentes

```typescript
// catalog/pages/book-list/book-list.component.ts
@Component({
  selector: 'app-book-list',
  standalone: true,
  template: `
    @if (store.loading()) {
      <app-loading-overlay />
    }
    @if (store.isEmpty()) {
      <app-empty-state />
    } @else {
      <app-book-table [books]="store.books()" />
    }
  `,
})
export class BookListComponent {
  protected readonly store = inject(BookCatalogStore);
}
```

---

## 6. Componentes

### 6.1 Core Services

#### `ApiService`

```typescript
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

#### `ErrorInterceptor`

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejo centralizado de errores HTTP
      return throwError(() => error);
    })
  );
};
```

### 6.2 Componentes de Catálogo

#### `BookTableComponent`

Tabla principal del catálogo. Recibe `books` como input y delega en subcomponentes:

```typescript
@Component({
  selector: 'app-book-table',
  standalone: true,
  // Sin mat-table: usa <table> HTML nativo con clases Tailwind
})
export class BookTableComponent {
  books = input.required<Book[]>();
}
```

#### `FilterPanelComponent`

Panel de filtros lateral. Sin `mat-select` ni `mat-form-field` — usa componentes propios con Tailwind:

- `SearchableSelectComponent`: dropdown nativo con búsqueda
- `MultiSelectChipsComponent`: selección múltiple con chips visuales
- `SemanticSearchComponent`: búsqueda por texto libre (semántica)
- `TextFilterInputComponent`: filtro por texto exacto

#### Diálogos

Los diálogos son componentes propios posicionados con Tailwind (`fixed inset-0 z-modal`), sin `MatDialog`:

```typescript
// dialogs/book-description-dialog/book-description-dialog.component.ts
@Component({
  selector: 'app-book-description-dialog',
  standalone: true,
  // Overlay con fixed + z-index de Tailwind
})
export class BookDescriptionDialogComponent {
  book = input.required<Book>();
  close = output<void>();
}
```

### 6.3 Componentes de Layout

```typescript
// layout/main-layout/main-layout.component.ts
@Component({
  selector: 'app-main-layout',
  standalone: true,
  template: `
    <div class="min-h-screen bg-background-primary dark:bg-background-dark-primary">
      <app-header />
      <main class="container mx-auto px-4 py-6">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
})
export class MainLayoutComponent {}
```

---

## 7. Routing

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./catalog/pages/book-list/book-list.component')
            .then(m => m.BookListComponent),
      },
    ],
  },
];
```

---

## 8. Storybook

Storybook se usa para documentar y desarrollar componentes en aislamiento. Accesible en `http://localhost:6006` en el entorno de desarrollo.

### 8.1 Estructura de stories

Cada componente tiene su fichero `.stories.ts` al lado del componente:

```
catalog/components/data-display/level-badge/
├── level-badge.component.ts
├── level-badge.component.html
└── level-badge.stories.ts
```

### 8.2 Ejemplo de story con Tailwind

```typescript
// level-badge.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { LevelBadgeComponent } from './level-badge.component';

const meta: Meta<LevelBadgeComponent> = {
  title: 'Catalog/DataDisplay/LevelBadge',
  component: LevelBadgeComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<LevelBadgeComponent>;

export const Beginner: Story = {
  args: { level: 'beginner' },
};

export const Advanced: Story = {
  args: { level: 'advanced' },
};
```

### 8.3 Configuración Storybook con Tailwind

El preview de Storybook importa los estilos globales de Tailwind:

```typescript
// .storybook/preview.ts
import '../src/styles.scss'; // Incluye las directivas @tailwind

export const parameters = {
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#f6f7f8' },
      { name: 'dark', value: '#111d21' },
    ],
  },
};
```

---

## 9. Testing

### 9.1 Tests unitarios

```typescript
// tests: usando Vitest + Angular Testing Library
describe('BookCatalogStore', () => {
  it('should set loading to true while searching', async () => {
    // Arrange
    const { store } = setupStore();
    // Act
    const searchPromise = store.search({});
    // Assert
    expect(store.loading()).toBe(true);
    await searchPromise;
    expect(store.loading()).toBe(false);
  });
});
```

### 9.2 Comandos de test

```bash
# Desde el contenedor
docker exec library-web-client npm test
docker exec library-web-client npm run test:coverage
```

---

## 10. Docker

### 10.1 Dockerfile (producción)

```dockerfile
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

### 10.2 nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 11. Historial de decisiones relevantes

| HU | Decisión |
|----|----------|
| HU-014 | Setup inicial del web client con Angular |
| HU-015 | Página de lista de libros con tabla y filtros |
| HU-016 | Layout general y sistema de tema dark/light |
| HU-017 | Dockerización del web client (Nginx) |
| HU-020 | **Migración completa de Angular Material a Tailwind CSS** |
| HU-023 | Diagramas de arquitectura |
| HU-027 | Mejoras al catálogo y filtros |

---

## 12. Referencias

- [Angular 21 Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Storybook for Angular](https://storybook.js.org/docs/angular/get-started/introduction)
- [Playwright](https://playwright.dev)
- [Vitest](https://vitest.dev)
- [Migration doc: Angular Material → Tailwind CSS](./05-migration-material-to-tailwind.md)
