# Design Doc: HU-014 - Configuración Inicial del Web Client Angular

## Metadata

| Campo | Valor |
|-------|-------|
| **ID** | HU-014 |
| **Estado** | Borrador |
| **Fecha** | 2026-02-22 |
| **Prioridad** | Alta |
| **Estimación** | 2-3 días |

---

## 1. Historia de Usuario

**Como** desarrollador del proyecto Library,  
**Quiero** tener el proyecto Angular configurado con todas las herramientas y estructura base,  
**Para** poder comenzar a desarrollar las features del cliente web sobre una base sólida y consistente.

---

## 2. Descripción Funcional

### 2.1 Contexto

El proyecto Library necesita un cliente web para permitir a los usuarios buscar libros y enviarlos a su Kindle. Actualmente solo existe el directorio vacío `apps/web-client/` con un archivo `.gitkeep`.

Esta historia de usuario establece la base del proyecto Angular con:
- Angular 21 (última versión estable)
- Angular Material con tema personalizado
- Estructura de carpetas siguiendo **Screaming Architecture**
- Configuración de linting (ESLint + Prettier)
- Configuración de testing (Jest)
- Toggle de modo oscuro/claro funcional

### 2.2 Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Angular | 21.x |
| Lenguaje | TypeScript | 5.x |
| UI Components | Angular Material | 21.x |
| Estilos | SCSS + CSS Variables | - |
| Linting | ESLint + Prettier | Latest |
| Testing Unit | Jest + @angular-builders/jest | Latest |
| Testing E2E | Playwright | Latest |
| Package Manager | npm | - |

### 2.3 Screaming Architecture

La estructura de carpetas debe "gritar" el dominio del negocio, no conceptos técnicos. Los nombres de las features reflejan el vocabulario del negocio:

```
apps/web-client/
├── src/
│   ├── app/
│   │   ├── core/                          # Servicios singleton, guards, interceptors
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── theme.service.ts
│   │   │   │   └── index.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── error.interceptor.ts
│   │   │   │   └── index.ts
│   │   │   ├── models/                    # Modelos de dominio compartidos
│   │   │   │   ├── book.model.ts
│   │   │   │   ├── author.model.ts
│   │   │   │   ├── category.model.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── catalog/                       # 🔊 SCREAMING: Feature de catálogo de libros
│   │   │   ├── components/
│   │   │   │   ├── book-table/
│   │   │   │   ├── filter-panel/
│   │   │   │   ├── semantic-search/
│   │   │   │   └── index.ts
│   │   │   ├── pages/
│   │   │   │   ├── search/                # Página de búsqueda
│   │   │   │   └── detail/                # Página de detalle
│   │   │   ├── services/
│   │   │   │   ├── book.service.ts
│   │   │   │   ├── catalog.store.ts       # Estado con Signals
│   │   │   │   └── index.ts
│   │   │   ├── catalog.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── kindle/                        # 🔊 SCREAMING: Feature de envío a Kindle
│   │   │   ├── components/
│   │   │   │   ├── send-to-kindle-form/
│   │   │   │   ├── send-to-kindle-dialog/
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── kindle.service.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── shared/                        # Componentes y utilidades compartidas
│   │   │   ├── components/
│   │   │   │   ├── theme-toggle/
│   │   │   │   ├── language-flag/
│   │   │   │   └── index.ts
│   │   │   ├── directives/
│   │   │   ├── pipes/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/                        # Componentes de layout
│   │   │   ├── main-layout/
│   │   │   │   ├── main-layout.component.ts
│   │   │   │   ├── main-layout.component.html
│   │   │   │   ├── main-layout.component.scss
│   │   │   │   └── main-layout.component.spec.ts
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   └── index.ts
│   │   │
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   │
│   ├── assets/
│   │   └── flags/                         # Banderas ISO para idiomas (futuro)
│   │
│   ├── styles/
│   │   ├── _variables.scss                # Variables CSS/SCSS
│   │   ├── _themes.scss                   # Temas dark/light
│   │   ├── _typography.scss               # Tipografía Inter
│   │   ├── _material-overrides.scss       # Overrides de Material
│   │   └── styles.scss                    # Entry point
│   │
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   │
│   ├── index.html
│   └── main.ts
│
├── tests/                                 # Tests separados del código fuente
│   ├── unit/
│   │   ├── core/
│   │   ├── catalog/
│   │   ├── kindle/
│   │   └── shared/
│   ├── integration/
│   └── e2e/
│
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── jest.config.ts
├── eslint.config.js
├── .prettierrc
└── .gitignore
```

### 2.4 Justificación de Screaming Architecture

| Concepto Técnico (evitar) | Concepto de Dominio (preferir) | Razón |
|---------------------------|--------------------------------|-------|
| `features/book-search/` | `catalog/` | El catálogo es el concepto de negocio que agrupa búsqueda y detalle |
| `features/book-detail/` | `catalog/pages/detail/` | El detalle es una vista dentro del catálogo |
| `features/send-kindle/` | `kindle/` | Kindle es una capacidad de negocio diferenciada |

---

## 3. Requisitos Técnicos

### 3.1 Angular Material - Tema Personalizado

El tema debe implementar la guía de estilos definida en `03-web-client-design.md`:

#### Colores

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--color-bg-primary` | `#f8fafc` | `#0f172a` |
| `--color-bg-surface` | `#ffffff` | `#1e293b` |
| `--color-accent` | `#17a1cf` | `#17a1cf` |
| `--color-text-primary` | `#0f172a` | `#f8fafc` |
| `--color-text-secondary` | `#64748b` | `#94a3b8` |

#### Tipografía

- **Fuente principal:** Inter (Google Fonts)
- **Escala:** h1 (32px), h2 (24px), h3 (20px), body (16px), body-sm (14px), caption (12px)

#### Redondez

- **Estándar:** 8px para cards, botones, inputs

### 3.2 Sistema de Temas (Dark/Light)

- Toggle accesible desde el header
- Persistencia en `localStorage`
- Respeta preferencia del sistema (`prefers-color-scheme`)
- Implementado con `data-theme` attribute en `<html>`

### 3.3 Linting y Formateo

- **ESLint:** Configuración estricta con reglas de Angular
- **Prettier:** Integrado con ESLint (eslint-plugin-prettier)
- **Scripts:** `npm run lint` y `npm run lint:fix`

### 3.4 Testing con Jest

- **Framework:** Jest con @angular-builders/jest
- **Estructura:** Tests en carpeta `tests/` separada del código fuente
- **Naming:** `*.spec.ts` para unit tests
- **Scripts:** `npm test`, `npm run test:watch`, `npm run test:coverage`

### 3.5 Standalone Components

- Todos los componentes serán **standalone** (Angular 21 default)
- No se usarán NgModules excepto para configuración de providers

---

## 4. Criterios de Aceptación

### 4.1 Instalación y Configuración Base

- [ ] Proyecto Angular 21 creado en `apps/web-client/`
- [ ] Angular Material instalado y configurado
- [ ] SCSS configurado como preprocesador de estilos
- [ ] Routing básico configurado (lazy loading preparado)

### 4.2 Estructura de Carpetas

- [ ] Estructura Screaming Architecture creada según sección 2.3
- [ ] Archivos `index.ts` (barrel exports) en cada módulo
- [ ] Separación de tests en carpeta `tests/`

### 4.3 Sistema de Estilos

- [ ] Variables SCSS definidas según guía de estilos
- [ ] Tema de Angular Material personalizado (colores, tipografía)
- [ ] Fuente Inter cargada desde Google Fonts
- [ ] Modo dark/light implementado con CSS variables

### 4.4 Theme Toggle

- [ ] `ThemeService` implementado con Signals
- [ ] `ThemeToggleComponent` en shared
- [ ] Persistencia en localStorage
- [ ] Detección de preferencia del sistema

### 4.5 Linting

- [ ] ESLint configurado con reglas de Angular
- [ ] Prettier integrado con ESLint
- [ ] `npm run lint` funciona sin errores
- [ ] `npm run lint:fix` corrige errores automáticamente

### 4.6 Testing

- [ ] Jest configurado con @angular-builders/jest
- [ ] Test de ejemplo funcionando
- [ ] `npm test` ejecuta tests correctamente
- [ ] `npm run test:coverage` genera reporte de cobertura

### 4.7 Documentación

- [ ] `03-web-client-design.md` actualizado con:
  - Versión exacta de Angular (21.x)
  - Estructura Screaming Architecture
  - Jest en lugar de Vitest
- [ ] README básico en `apps/web-client/`

---

## 5. Tareas Técnicas

### Tarea 1: Crear proyecto Angular base
- Ejecutar `ng new` con configuración específica
- Configurar SCSS, routing, standalone components
- Eliminar boilerplate innecesario
- **Estimación:** 30 min

### Tarea 2: Instalar y configurar Angular Material
- Instalar Angular Material
- Crear tema personalizado con paleta de colores
- Configurar tipografía Inter
- **Estimación:** 1 hora

### Tarea 3: Crear estructura de carpetas Screaming Architecture
- Crear todas las carpetas según estructura definida
- Crear archivos index.ts (barrel exports)
- Crear archivos placeholder para servicios core
- **Estimación:** 30 min

### Tarea 4: Implementar sistema de estilos
- Crear archivos SCSS (_variables, _themes, _typography, _material-overrides)
- Implementar CSS variables para dark/light mode
- Configurar estilos globales
- **Estimación:** 1 hora

### Tarea 5: Implementar ThemeService y ThemeToggle
- Crear ThemeService con Signals
- Crear ThemeToggleComponent
- Integrar en layout básico (header placeholder)
- Tests unitarios
- **Estimación:** 1 hora

### Tarea 6: Configurar ESLint y Prettier
- Instalar dependencias (eslint, prettier, plugins)
- Crear eslint.config.js
- Crear .prettierrc
- Verificar que lint pasa sin errores
- **Estimación:** 45 min

### Tarea 7: Configurar Jest
- Instalar @angular-builders/jest y dependencias
- Crear jest.config.ts
- Configurar tsconfig.spec.json
- Crear test de ejemplo y verificar ejecución
- **Estimación:** 45 min

### Tarea 8: Actualizar documentación
- Actualizar `03-web-client-design.md` con estructura Screaming Architecture
- Actualizar versión de Angular a 21.x
- Cambiar Vitest por Jest
- Crear README en apps/web-client/
- **Estimación:** 30 min

---

## 6. Dependencias

### 6.1 Dependencias de Producción

```json
{
  "@angular/core": "^21.0.0",
  "@angular/material": "^21.0.0",
  "@angular/cdk": "^21.0.0",
  "rxjs": "^7.8.0",
  "tslib": "^2.6.0"
}
```

### 6.2 Dependencias de Desarrollo

```json
{
  "@angular-builders/jest": "^18.0.0",
  "@types/jest": "^29.0.0",
  "jest": "^29.0.0",
  "jest-preset-angular": "^14.0.0",
  "eslint": "^9.0.0",
  "@angular-eslint/eslint-plugin": "^19.0.0",
  "@angular-eslint/template-parser": "^19.0.0",
  "prettier": "^3.0.0",
  "eslint-config-prettier": "^9.0.0",
  "eslint-plugin-prettier": "^5.0.0"
}
```

---

## 7. Notas de Implementación

### 7.1 Comando de creación del proyecto

```bash
ng new web-client \
  --directory=. \
  --style=scss \
  --routing=true \
  --standalone=true \
  --ssr=false \
  --skip-git=true \
  --package-manager=npm \
  --strict=true
```

### 7.2 Instalación de Angular Material

```bash
ng add @angular/material \
  --theme=custom \
  --typography=true \
  --animations=true
```

### 7.3 Configuración de path aliases

En `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@core/*": ["src/app/core/*"],
      "@catalog/*": ["src/app/catalog/*"],
      "@kindle/*": ["src/app/kindle/*"],
      "@shared/*": ["src/app/shared/*"],
      "@layout/*": ["src/app/layout/*"],
      "@env/*": ["src/environments/*"]
    }
  }
}
```

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Incompatibilidad Jest con Angular 21 | Media | Alto | Verificar compatibilidad antes de empezar; tener Vitest como backup |
| Conflictos ESLint con Angular 21 | Baja | Medio | Usar versiones compatibles según documentación oficial |

---

## 9. Definition of Done

- [ ] Código limpio (Lint/Typecheck OK)
- [ ] Tests unitarios para ThemeService y ThemeToggleComponent
- [ ] Documentación actualizada (`03-web-client-design.md`, README)
- [ ] Commits realizados con Conventional Commits
- [ ] 0 lint errors, 0 type errors, all tests green, build success
- [ ] Toggle dark/light funciona correctamente
- [ ] Estructura de carpetas completa según Screaming Architecture
