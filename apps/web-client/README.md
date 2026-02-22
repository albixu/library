# Library Web Client

Cliente web Angular para el sistema de gestión de biblioteca digital **Library**. Permite buscar libros en el catálogo y enviarlos a dispositivos Kindle.

## Stack Tecnologico

| Tecnologia | Version |
|------------|---------|
| Angular | 21.x |
| Angular Material | 21.x (M2 Theme) |
| TypeScript | 5.9.x |
| Vitest | 4.x |
| ESLint | 9.x (Flat Config) |

## Comandos Disponibles

```bash
# Desarrollo
npm start              # Servidor de desarrollo (http://localhost:4200)
npm run watch          # Build en modo watch

# Testing
npm test               # Ejecutar tests
npm run test:watch     # Tests en modo watch
npm run test:coverage  # Tests con reporte de cobertura

# Build
npm run build          # Build de produccion

# Linting
npm run lint           # Ejecutar ESLint
npm run lint:fix       # Ejecutar ESLint con auto-fix
```

## Estructura del Proyecto (Screaming Architecture)

```
src/
├── app/
│   ├── core/                    # Servicios singleton, interceptors, modelos
│   │   ├── services/            # ThemeService, ApiService
│   │   ├── interceptors/        # HTTP interceptors
│   │   └── models/              # Interfaces de dominio
│   │
│   ├── catalog/                 # Feature: Catalogo de libros
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── catalog.routes.ts
│   │
│   ├── kindle/                  # Feature: Envio a Kindle
│   │   ├── components/
│   │   └── services/
│   │
│   ├── shared/                  # Componentes compartidos
│   │   ├── components/          # ThemeToggleComponent, etc.
│   │   ├── directives/
│   │   └── pipes/
│   │
│   ├── layout/                  # Componentes de layout
│   │   ├── main-layout/
│   │   ├── header/
│   │   └── footer/
│   │
│   ├── app.ts                   # Root component
│   ├── app.routes.ts            # Rutas principales
│   └── app.config.ts            # Configuracion de la app
│
├── styles/
│   ├── _variables.scss          # Variables SCSS, spacing, breakpoints
│   ├── _material-theme.scss     # Tema M2 personalizado (cyan #17a1cf)
│   └── styles.scss              # Entry point, CSS variables dark/light
│
└── index.html
```

## Path Aliases

Configurados en `tsconfig.json` para imports limpios:

```typescript
import { ThemeService } from '@core/services';
import { ThemeToggleComponent } from '@shared/components';
```

| Alias | Path |
|-------|------|
| `@core/*` | `src/app/core/*` |
| `@catalog/*` | `src/app/catalog/*` |
| `@kindle/*` | `src/app/kindle/*` |
| `@shared/*` | `src/app/shared/*` |
| `@layout/*` | `src/app/layout/*` |

## Sistema de Temas

El cliente soporta modo claro y oscuro con:

- **CSS Variables**: Definidas en `styles.scss`
- **ThemeService**: Gestiona el estado del tema con Angular Signals
- **ThemeToggleComponent**: Toggle accesible en el header
- **Persistencia**: Se guarda en localStorage
- **System preference**: Respeta `prefers-color-scheme` del sistema

### Paleta de colores

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Background | `#f8fafc` | `#0f172a` |
| Surface | `#ffffff` | `#1e293b` |
| Accent | `#17a1cf` | `#17a1cf` |
| Text Primary | `#0f172a` | `#f8fafc` |

## Testing

- **Framework**: Vitest (default en Angular 21)
- **Coverage**: `@vitest/coverage-v8`
- **Tests actuales**: 24 tests (ThemeService: 15, ThemeToggle: 6, App: 3)

```bash
# Ejecutar tests
npm test

# Ver cobertura
npm run test:coverage
```

## Desarrollo

### Requisitos

- Node.js 22+
- npm 10+

### Inicio rapido

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start

# Abrir en navegador
open http://localhost:4200
```

### Convenios de codigo

- **ESLint 9** con flat config
- **Prettier** integrado
- **Angular ESLint** para templates
- Ejecutar `npm run lint:fix` antes de commits

## Documentacion Relacionada

- [Design Doc: Web Client](../../docs/design_docs/03-web-client-design.md)
- [API Design](../../docs/design_docs/04-api-design.md)
- [Project Overview](../../docs/design_docs/01-project-overview.md)
