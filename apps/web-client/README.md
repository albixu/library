# Library Web Client

Cliente web Angular para el sistema de gestión de biblioteca digital **Library**. Permite buscar libros en el catálogo, filtrar por múltiples criterios y enviarlos a dispositivos Kindle.

## Features

- 📚 **Catálogo de libros** con búsqueda y filtrado avanzado
- 🔍 **Filtros múltiples**: ISBN, título, autor, tipo, categorías, niveles y búsqueda semántica
- 📱 **Responsive**: Vista tabla en desktop, tarjetas en móvil
- 📧 **Envío a Kindle** directamente desde la interfaz
- 🌗 **Tema claro/oscuro** con detección automática del sistema
- ♿ **Accesible** con soporte completo para ARIA

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
npm run storybook      # Iniciar Storybook para documentación de componentes

# Testing
npm test               # Ejecutar tests
npm run test:watch     # Tests en modo watch
npm run test:coverage  # Tests con reporte de cobertura

# Build
npm run build          # Build de produccion

# Linting
npm run lint           # Ejecutar ESLint
npm run lint:fix       # Ejecutar ESLint con auto-fix

# E2E Testing
npm run e2e            # Tests end-to-end con Playwright
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
- **E2E**: Playwright

### Tipos de Tests

| Tipo | Descripción | Comando |
|------|-------------|---------|
| Unit | Tests de componentes y servicios | `npm test` |
| E2E | Tests end-to-end con Playwright | `npm run e2e` |

```bash
# Ejecutar tests
npm test

# Ver cobertura
npm run test:coverage

# E2E tests
npm run e2e
```

## Storybook

El proyecto incluye Storybook para documentación visual de componentes:

```bash
npm run storybook
```

Los componentes están organizados en categorías:
- **Catalog > Data Display**: CategoryChips, FormatIcon, LanguageFlag, LevelBadge, TruncatedText
- **Catalog > Filters**: TextFilterInput, SearchableSelect, MultiSelectChips, SemanticSearch, FilterPanel
- **Catalog > Table**: EmptyState, LoadingOverlay, Paginator, BookCard, BookTable
- **Catalog > Dialogs**: SendToKindleDialog

## Desarrollo

### Requisitos

- Node.js 22+ (o Docker)
- npm 10+

### Opcion 1: Docker (Recomendado)

El proyecto incluye configuracion Docker para desarrollo sin necesidad de instalar Node.js localmente:

```bash
# Desde la raiz del monorepo

# Construir la imagen
docker compose build web-client

# Iniciar el servidor de desarrollo
docker compose up web-client

# Abrir en navegador
open http://localhost:4200
```

#### Comandos Docker

```bash
# Tests unitarios
docker exec library-web-client npm test

# Tests en modo watch
docker exec -it library-web-client npm run test:watch

# Linting
docker exec library-web-client npm run lint
docker exec library-web-client npm run lint:fix

# Build de produccion
docker exec library-web-client npm run build

# Storybook (puerto 6006)
docker exec -it library-web-client npm run storybook

# Tests E2E con Playwright
docker exec library-web-client npm run test:e2e

# Shell dentro del contenedor
docker exec -it library-web-client sh
```

#### Hot Reload

El hot reload funciona automaticamente. Si modificas archivos en `src/`, Angular detectara los cambios y recargara el navegador.

> **Nota Windows**: Se usa `--poll 2000` para detectar cambios en volumes de Docker. Esto puede causar un pequeno retraso (hasta 2 segundos) en la deteccion de cambios.

#### Troubleshooting Docker

**Error: EACCES permission denied**
```bash
# Reconstruir la imagen sin cache
docker compose build --no-cache web-client

# Eliminar volumes y reconstruir
docker compose down -v
docker volume rm library-web-client-node-modules library-web-client-angular-cache
docker compose build web-client
```

**Hot reload no funciona**
```bash
# Reiniciar el contenedor
docker compose restart web-client
```

**Tests E2E fallan con errores de browser**
```bash
# Reinstalar Playwright browsers
docker exec library-web-client npx playwright install
```

### Opcion 2: Local (Sin Docker)

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
