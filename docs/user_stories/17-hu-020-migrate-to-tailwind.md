# HU-020: Migración de Angular Material a TailwindCSS

## Descripción

**Como** desarrollador del equipo,  
**Quiero** migrar el web client de Angular Material a HTML nativo + TailwindCSS,  
**Para** lograr un alineamiento pixel-perfect con los diseños de Stitch y tener control total sobre el estilo de la aplicación.

## Contexto

Actualmente el web client usa Angular Material como framework UI, pero esto ha generado conflictos constantes con nuestros diseños custom de Stitch. Los intentos de override con `::ng-deep` y `!important` son frágiles y no logran el resultado esperado.

Esta historia implementa la decisión técnica documentada en `docs/design_docs/05-migration-material-to-tailwind.md` de realizar una **migración radical completa** a TailwindCSS.

## Diseños de Referencia

| Dispositivo | Modo | Ubicación |
|-------------|------|-----------|
| Desktop | Dark | `docs/web/designs/gestor_libros_-_dark_desktop/` |
| Desktop | Light | `docs/web/designs/gestor_libros_-_light_desktop/` |
| Mobile | Dark | `docs/web/designs/gestor_libros_-_dark_mobile/` |

## Documentación Relacionada

- **Design Doc**: `docs/design_docs/05-migration-material-to-tailwind.md`
- **Design System**: Stitch (HTML + TailwindCSS)
- **Web Client Design**: `docs/design_docs/03-web-client-design.md`

---

## Criterios de Aceptación

### AC-1: Configuración Base

- [ ] TailwindCSS instalado y configurado con los colores de Stitch
- [ ] Fuente Inter cargada desde Google Fonts
- [ ] Material Symbols (iconos) cargados desde Google Fonts CDN
- [ ] Angular Material completamente removido del proyecto (excepto CDK para overlays)
- [ ] Build y servidor de desarrollo funcionando correctamente

### AC-2: Componentes de Tabla

- [ ] `book-table` reescrito con `<table>` nativo + Tailwind
- [ ] `paginator` reescrito con botones nativos + Tailwind
- [ ] `book-card` (mobile) reescrito sin Material
- [ ] `empty-state` reescrito sin Material Icons
- [ ] `loading-overlay` usando `ngx-spinner` o similar
- [ ] Todos los componentes coinciden pixel-perfect con Stitch

### AC-3: Componentes de Filtros

- [ ] `filter-panel` reescrito sin Material
- [ ] `text-filter-input` con `<input>` nativo + Tailwind
- [ ] `searchable-select` migrado a `ng-select` o similar
- [ ] `multi-select-chips` migrado a `ng-select` + chips custom
- [ ] `semantic-search` con `<textarea>` nativo + Tailwind
- [ ] Todos los filtros funcionan correctamente (debounce, validación, etc.)

### AC-4: Componentes de Visualización

- [ ] `level-badge` actualizado con clases Tailwind
- [ ] `category-chips` con tooltips nativos
- [ ] `format-icon` usando Material Symbols + tooltip nativo
- [ ] `language-flag` con tooltip nativo
- [ ] `truncated-text` con tooltip nativo
- [ ] Colores y estilos coinciden con Stitch

### AC-5: Layout y Navegación

- [ ] `header` reescrito sin Material
- [ ] `theme-toggle` reescrito sin Material
- [ ] `main-layout` actualizado para nueva estructura
- [ ] `book-list-page` integra todos los componentes correctamente
- [ ] Sidenav/drawer mobile usando CDK Overlay con estilos custom

### AC-6: Diálogos y Modales

- [ ] `send-to-kindle-dialog` usando CDK Dialog + inputs nativos
- [ ] Modal tiene estilos custom con Tailwind
- [ ] Funcionalidad de envío a Kindle intacta

### AC-7: Tests Actualizados

- [ ] Todos los tests unitarios pasan (80%+ cobertura)
- [ ] Selectores CSS actualizados (`.mat-*` → clases custom)
- [ ] Tests E2E actualizados y pasan
- [ ] No hay tests skipped relacionados con la migración

### AC-8: Storybook Actualizado

- [ ] Todas las stories actualizadas para reflejar nuevos componentes
- [ ] Stories obsoletas de Material eliminadas
- [ ] Storybook arranca sin errores
- [ ] Documentación visual completa

### AC-9: Diseño y Responsive

- [ ] Modo oscuro coincide pixel-perfect con Stitch dark desktop
- [ ] Modo claro coincide con Stitch light desktop
- [ ] Vista mobile responsive coincide con Stitch dark mobile
- [ ] Toggle dark/light funciona correctamente
- [ ] Transiciones suaves entre estados

### AC-10: Performance y Calidad

- [ ] Bundle size reducido en ~40% (500KB menos)
- [ ] Lighthouse score > 90 (performance)
- [ ] ESLint pasa sin errores ni warnings
- [ ] TypeScript compila sin errores
- [ ] No hay `::ng-deep` ni `!important` innecesarios

---

## Tareas de Implementación

### Tarea 1: Configuración de TailwindCSS e Infraestructura Base
**Estimación**: 3 horas  
**Branch**: `task/HU-020-install-tailwind`

- [ ] Instalar TailwindCSS y dependencias
- [ ] Configurar `tailwind.config.js` con colores de Stitch
- [ ] Configurar PostCSS
- [ ] Integrar Tailwind en `styles.scss`
- [ ] Cargar fuente Inter desde Google Fonts
- [ ] Cargar Material Symbols desde Google Fonts CDN
- [ ] Verificar que el build funciona correctamente
- [ ] Crear PR #1 a rama de historia

---

### Tarea 2: Instalación de Librerías y Configuración
**Estimación**: 2 horas  
**Branch**: `task/HU-020-install-libraries`

- [ ] Instalar `ng-select` (select con búsqueda)
- [ ] Instalar `ngx-spinner` (loading spinner)
- [ ] Configurar ng-select con estilos Tailwind custom
- [ ] Configurar ngx-spinner con colores de marca
- [ ] Crear componentes wrapper si es necesario
- [ ] Documentar uso de las librerías
- [ ] Crear PR #2 a rama de historia

---

### Tarea 3: Migrar Sistema de Iconos
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-icons`

- [ ] Reemplazar `MatIconModule` con Material Symbols
- [ ] Crear helper/directive para iconos si es necesario
- [ ] Actualizar todos los usos de `<mat-icon>` → `<span class="material-symbols-outlined">`
- [ ] Verificar que todos los iconos se muestran correctamente
- [ ] Actualizar tests relacionados
- [ ] Crear PR #3 a rama de historia

---

### Tarea 4: Migrar Componentes de Visualización Simples
**Estimación**: 3 horas  
**Branch**: `task/HU-020-migrate-display-components`

**Componentes a migrar:**
- `level-badge`
- `category-chips`
- `format-icon`
- `language-flag`
- `truncated-text`

**Acciones:**
- [ ] Reescribir cada componente con Tailwind
- [ ] Reemplazar `MatTooltipModule` con tooltips nativos (`title`)
- [ ] Aplicar colores exactos de Stitch
- [ ] Actualizar tests unitarios (5 archivos `.spec.ts`)
- [ ] Actualizar Storybook stories (5 archivos `.stories.ts`)
- [ ] Verificar visualmente contra Stitch
- [ ] Crear PR #4 a rama de historia

---

### Tarea 5: Migrar Empty State y Loading Overlay
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-states`

**Componentes a migrar:**
- `empty-state`
- `loading-overlay`

**Acciones:**
- [ ] Reescribir `empty-state` con HTML nativo + Tailwind
- [ ] Integrar `ngx-spinner` en `loading-overlay`
- [ ] Remover `MatIconModule`, `MatButtonModule`, `MatProgressSpinnerModule`
- [ ] Actualizar tests (2 archivos `.spec.ts`)
- [ ] Actualizar stories (2 archivos `.stories.ts`)
- [ ] Crear PR #5 a rama de historia

---

### Tarea 6: Migrar Tabla de Libros
**Estimación**: 4 horas  
**Branch**: `task/HU-020-migrate-table`

**Componente a migrar:**
- `book-table`

**Acciones:**
- [ ] Reemplazar `MatTableModule` con `<table>` nativo
- [ ] Aplicar estilos exactos de Stitch (headers, rows, borders, hover)
- [ ] Mantener funcionalidad de click en filas
- [ ] Mantener accesibilidad (ARIA, keyboard navigation)
- [ ] Remover imports de Material (MatTableModule, MatButtonModule, MatIconModule)
- [ ] Actualizar tests unitarios
- [ ] Actualizar story de Storybook
- [ ] Verificar visualmente contra `docs/web/designs/figma/table_container.svg`
- [ ] Crear PR #6 a rama de historia

---

### Tarea 7: Migrar Paginador
**Estimación**: 3 horas  
**Branch**: `task/HU-020-migrate-paginator`

**Componente a migrar:**
- `paginator`

**Acciones:**
- [ ] Reescribir con botones nativos + Tailwind
- [ ] Replicar diseño exacto de Stitch (Previous/Next/números)
- [ ] Migrar select de tamaño de página a `ng-select`
- [ ] Remover imports de Material
- [ ] Actualizar tests unitarios
- [ ] Actualizar story de Storybook
- [ ] Crear PR #7 a rama de historia

---

### Tarea 8: Migrar Book Card (Mobile)
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-card`

**Componente a migrar:**
- `book-card`

**Acciones:**
- [ ] Reescribir con HTML nativo + Tailwind
- [ ] Remover `MatRippleModule` (usar CSS transitions)
- [ ] Aplicar estilos mobile de Stitch
- [ ] Actualizar tests unitarios
- [ ] Actualizar story de Storybook
- [ ] Crear PR #8 a rama de historia

---

### Tarea 9: Migrar Filtros de Texto
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-text-filters`

**Componentes a migrar:**
- `text-filter-input`
- `semantic-search`

**Acciones:**
- [ ] Reescribir con `<input>` y `<textarea>` nativos + Tailwind
- [ ] Remover `MatFormFieldModule`, `MatInputModule`
- [ ] Mantener funcionalidad debounce
- [ ] Mantener validación
- [ ] Actualizar tests (2 archivos `.spec.ts`)
- [ ] Actualizar stories (2 archivos `.stories.ts`)
- [ ] Crear PR #9 a rama de historia

---

### Tarea 10: Migrar Selects con Búsqueda
**Estimación**: 4 horas  
**Branch**: `task/HU-020-migrate-selects`

**Componentes a migrar:**
- `searchable-select`
- `multi-select-chips`

**Acciones:**
- [ ] Integrar `ng-select` en ambos componentes
- [ ] Aplicar estilos custom Tailwind a ng-select
- [ ] Implementar chips custom para multi-select
- [ ] Remover `MatSelectModule`, `MatFormFieldModule`, `MatChipsModule`
- [ ] Mantener funcionalidad de búsqueda/filtrado
- [ ] Mantener dependencias (Type → Categories/Levels)
- [ ] Actualizar tests (2 archivos `.spec.ts`)
- [ ] Actualizar stories (2 archivos `.stories.ts`)
- [ ] Crear PR #10 a rama de historia

---

### Tarea 11: Migrar Panel de Filtros
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-filter-panel`

**Componente a migrar:**
- `filter-panel`

**Acciones:**
- [ ] Integrar todos los componentes de filtros migrados
- [ ] Remover `MatDividerModule`
- [ ] Aplicar estilos Tailwind para dividers y layout
- [ ] Verificar funcionalidad de "Limpiar filtros"
- [ ] Actualizar tests unitarios
- [ ] Actualizar story de Storybook
- [ ] Crear PR #11 a rama de historia

---

### Tarea 12: Migrar Header y Theme Toggle
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-header`

**Componentes a migrar:**
- `header`
- `theme-toggle`

**Acciones:**
- [ ] Reescribir con HTML nativo + Tailwind
- [ ] Aplicar estilos exactos de Stitch
- [ ] Remover Material buttons e icons
- [ ] Mantener funcionalidad de toggle dark/light
- [ ] Actualizar tests (2 archivos `.spec.ts`)
- [ ] Actualizar stories si existen
- [ ] Crear PR #12 a rama de historia

---

### Tarea 13: Migrar Layout Principal
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-layout`

**Componente a migrar:**
- `main-layout`

**Acciones:**
- [ ] Actualizar estructura de layout con Tailwind
- [ ] Verificar que header y contenido se posicionan correctamente
- [ ] Aplicar estilos de Stitch
- [ ] Actualizar tests si existen
- [ ] Crear PR #13 a rama de historia

---

### Tarea 14: Migrar Modal de Kindle
**Estimación**: 3 horas  
**Branch**: `task/HU-020-migrate-dialog`

**Componente a migrar:**
- `send-to-kindle-dialog`

**Acciones:**
- [ ] Mantener CDK Dialog para overlay
- [ ] Reemplazar contenido con inputs nativos + Tailwind
- [ ] Remover `MatFormFieldModule`, `MatInputModule`
- [ ] Aplicar estilos de modal custom
- [ ] Mantener validación de email
- [ ] Mantener estados loading/success/error
- [ ] Actualizar tests unitarios
- [ ] Actualizar story de Storybook
- [ ] Crear PR #14 a rama de historia

---

### Tarea 15: Migrar Página de Lista de Libros
**Estimación**: 2 horas  
**Branch**: `task/HU-020-migrate-page`

**Componente a migrar:**
- `book-list-page`

**Acciones:**
- [ ] Integrar todos los componentes migrados
- [ ] Mantener CDK Sidenav para mobile drawer
- [ ] Aplicar estilos Tailwind para layout
- [ ] Remover imports de Material (excepto CDK)
- [ ] Verificar responsive design (desktop + mobile)
- [ ] Actualizar tests unitarios
- [ ] Crear PR #15 a rama de historia

---

### Tarea 16: Remover Angular Material del Proyecto
**Estimación**: 2 horas  
**Branch**: `task/HU-020-remove-material`

**Acciones:**
- [ ] Remover `@angular/material` de `package.json`
- [ ] Mantener `@angular/cdk` (solo para overlays)
- [ ] Eliminar `_material-theme.scss`
- [ ] Limpiar imports no utilizados de Material en `app.config.ts`
- [ ] Ejecutar `npm install` para limpiar dependencias
- [ ] Verificar que el build funciona sin Material
- [ ] Verificar bundle size (debe reducir ~500KB)
- [ ] Crear PR #16 a rama de historia

---

### Tarea 17: Actualizar Tests Unitarios
**Estimación**: 4 horas  
**Branch**: `task/HU-020-update-unit-tests`

**Acciones:**
- [ ] Revisar TODOS los archivos `.spec.ts` del proyecto
- [ ] Actualizar selectores CSS (`.mat-*` → clases custom)
- [ ] Actualizar mocks de componentes Material
- [ ] Verificar que todos los tests pasan
- [ ] Verificar cobertura mínima 80%
- [ ] Arreglar tests rotos por la migración
- [ ] Ejecutar `npm test` y validar resultado
- [ ] Crear PR #17 a rama de historia

---

### Tarea 18: Actualizar Tests E2E (Playwright)
**Estimación**: 3 horas  
**Branch**: `task/HU-020-update-e2e-tests`

**Acciones:**
- [ ] Actualizar selectores en `book-list.spec.ts`
- [ ] Actualizar selectores en `layout-theme.spec.ts`
- [ ] Actualizar selectores en `responsive.spec.ts`
- [ ] Agregar nuevos tests si es necesario
- [ ] Ejecutar `npm run test:e2e` y validar resultado
- [ ] Capturar screenshots para comparación visual
- [ ] Crear PR #18 a rama de historia

---

### Tarea 19: Actualizar Storybook Stories
**Estimación**: 3 horas  
**Branch**: `task/HU-020-update-storybook`

**Acciones:**
- [ ] Revisar TODAS las stories existentes
- [ ] Actualizar stories para componentes migrados
- [ ] Eliminar stories obsoletas de Material
- [ ] Verificar que Storybook arranca sin errores
- [ ] Agregar documentación de uso de Tailwind en stories
- [ ] Ejecutar `npm run storybook` y verificar
- [ ] Crear PR #19 a rama de historia

---

### Tarea 20: Verificación Visual y Ajustes Finales
**Estimación**: 4 horas  
**Branch**: `task/HU-020-visual-verification`

**Acciones:**
- [ ] Comparar visualmente con `gestor_libros_-_dark_desktop`
- [ ] Comparar visualmente con `gestor_libros_-_light_desktop`
- [ ] Comparar visualmente con `gestor_libros_-_dark_mobile`
- [ ] Ajustar espaciados, colores, tipografía para match exacto
- [ ] Verificar transiciones y animaciones
- [ ] Verificar estados hover/focus/active
- [ ] Verificar accesibilidad (keyboard navigation, ARIA)
- [ ] Crear PR #20 a rama de historia

---

### Tarea 21: Code Review y Refactorización Final
**Estimación**: 3 horas  
**Branch**: `task/HU-020-final-refactor`

**Acciones:**
- [ ] Code review completo de todos los componentes migrados
- [ ] Refactorizar código duplicado
- [ ] Extraer clases Tailwind comunes a utilities
- [ ] Verificar que no hay `::ng-deep` ni `!important` innecesarios
- [ ] Verificar nomenclatura de clases CSS
- [ ] Limpiar imports no utilizados
- [ ] Crear PR #21 a rama de historia

---

### Tarea 22: Ejecutar ESLint y Corregir Issues
**Estimación**: 2 horas  
**Branch**: `task/HU-020-eslint`

**Acciones:**
- [ ] Ejecutar `npm run lint` en todo el proyecto
- [ ] Corregir errores de ESLint
- [ ] Corregir warnings de ESLint
- [ ] Ejecutar `npm run lint:fix` para auto-fix
- [ ] Verificar que no quedan issues
- [ ] Crear PR #22 a rama de historia

---

### Tarea 23: Verificar Cobertura de Tests Final
**Estimación**: 2 horas  
**Branch**: `task/HU-020-test-coverage`

**Acciones:**
- [ ] Ejecutar `npm run test:coverage`
- [ ] Verificar que cobertura es >= 80%
- [ ] Agregar tests faltantes si es necesario
- [ ] Generar reporte HTML de cobertura
- [ ] Documentar áreas con baja cobertura (si las hay)
- [ ] Crear PR #23 a rama de historia

---

### Tarea 24: Actualizar Documentación
**Estimación**: 2 horas  
**Branch**: `task/HU-020-update-docs`

**Acciones:**
- [ ] Actualizar `03-web-client-design.md` reflejando cambio a Tailwind
- [ ] Actualizar `README.md` del web-client si es necesario
- [ ] Actualizar documentación de componentes en `docs/web/story_books/`
- [ ] Agregar guía de uso de Tailwind en el proyecto
- [ ] Documentar librerías externas (ng-select, ngx-spinner)
- [ ] Crear PR #24 a rama de historia

---

### Tarea 25: Verificación Final y Preparación para Merge
**Estimación**: 2 horas  
**Branch**: Rama de historia `feature/HU-020-migrate-to-tailwind`

**Acciones:**
- [ ] Verificar que TODAS las PRs anteriores están mergeadas
- [ ] Ejecutar todos los tests (unit + integration + E2E)
- [ ] Ejecutar ESLint (0 errores)
- [ ] Ejecutar build de producción
- [ ] Verificar bundle size final
- [ ] Verificar Lighthouse score
- [ ] Ejecutar Storybook
- [ ] Verificar visualmente en localhost:4200
- [ ] Preparar resumen de cambios para PR final a `dev`
- [ ] Crear PR final de historia completa a `dev`

---

## Estimación Total

| Fase | Horas |
|------|-------|
| Configuración e infraestructura | 7 |
| Componentes simples | 7 |
| Componentes complejos (tabla, filtros) | 15 |
| Modal y página | 5 |
| Tests y Storybook | 12 |
| Verificación y refactor | 9 |
| Documentación | 2 |
| **Total** | **57 horas (~7-8 días laborales)** |

**Nota**: Estimación conservadora. Con enfoque agresivo puede completarse en 2-3 días intensivos.

---

## Dependencias

- HU-015: Pantalla de Listado de Libros (completada) ✅
- HU-016: Layout Principal y Theme Toggle (completada) ✅
- Design Doc `05-migration-material-to-tailwind.md` ✅

---

## Notas de Implementación

### Workflow de PRs

**IMPORTANTE**: A diferencia del flujo normal en `AGENTS.md`, en esta historia cada tarea genera un PR individual a la rama de la historia para revisión manual.

```bash
# Ejemplo para Tarea 1
git checkout -b task/HU-020-install-tailwind
# ... hacer cambios ...
git commit -m "feat: install and configure TailwindCSS"
git push origin task/HU-020-install-tailwind
# Crear PR a feature/HU-020-migrate-to-tailwind
# Esperar revisión y aprobación
# Mergear PR
# Continuar con Tarea 2
```

### Verificación Visual Continua

Cada tarea debe incluir verificación visual contra diseños de Stitch. No esperar hasta el final.

### Prioridad en Tests

Mantener tests pasando en cada tarea. No acumular tests rotos para arreglar al final.

### Comunicación

Cada PR debe incluir:
- Screenshots del componente antes/después
- Comparación con diseño de Stitch
- Lista de cambios realizados
- Impacto en bundle size (si aplica)

---

## Definition of Done

- ✅ Todos los componentes migrados y funcionando
- ✅ 0 dependencias de `@angular/material` (excepto CDK)
- ✅ Diseño coincide pixel-perfect con Stitch (dark/light/mobile)
- ✅ Todos los tests pasan (unit + E2E)
- ✅ Cobertura de tests >= 80%
- ✅ ESLint 0 errores, 0 warnings
- ✅ Storybook actualizado y funcional
- ✅ Bundle size reducido ~500KB
- ✅ Lighthouse score > 90
- ✅ Documentación actualizada
- ✅ PR final a `dev` aprobado y mergeado

---

## Riesgos Identificados

| Riesgo | Mitigación |
|--------|-----------|
| Tests extensos rotos | Actualizar por tarea, no al final |
| ng-select no se ajusta a diseño | Aplicar estilos custom agresivos o cambiar lib |
| Timeline más largo de lo estimado | Priorizar funcionalidad sobre perfección visual inicial |
| Regresiones funcionales | Tests E2E detectan problemas temprano |

---

**Historia creada**: February 24, 2026  
**Estimación**: 57 horas (7-8 días)  
**Prioridad**: Alta  
**Complejidad**: 🔴 Alta
