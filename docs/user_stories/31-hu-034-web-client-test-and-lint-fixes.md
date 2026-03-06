# HU-034: Corrección de Tests y Linter del Cliente Web

## Descripción

**Como** desarrollador del proyecto,  
**Quiero** corregir los 44 tests fallando y los 5 errores de linter del cliente web Angular,  
**Para** garantizar que el cliente web cumple los estándares de calidad definidos en la Definition of Done, con 0 errores de lint y todos los tests en verde.

---

## Contexto y motivación

Tras la auditoría completa del cliente web Angular se detectaron dos categorías de problemas:

### Categoría A — Tests fallando (44 tests en 13 archivos)

El patrón dominante es una **inconsistencia en el idioma de los `aria-label`**: los componentes los tienen en español, pero los tests (contrato de accesibilidad) los esperan en inglés. Los `aria-label` son consumidos principalmente por herramientas de accesibilidad internacionales (lectores de pantalla, Playwright, etc.) y deben estar en inglés según el estándar del proyecto. Los **textos visibles al usuario** (botones, títulos, descripciones) pueden permanecer en español.

Adicionalmente, se detectan dos problemas estructurales:
- **`book-search.store.ts`**: `DEFAULT_PAGINATION.limit = 25` pero el spec espera `50`.
- **`book-table.component.ts`**: los tests esperan el componente `<app-truncated-text>` para las descripciones, pero el componente usa `<button class="description-button">` directamente.

### Categoría B — Errores de linter (5 errores en 4 archivos)

Errores de formato Prettier y una regla de accesibilidad de Angular ESLint.

---

## Criterios de Aceptación

### CA-1: Componentes con `aria-label` en inglés
- Todos los `aria-label` de los componentes afectados están en inglés.
- Los textos visibles al usuario (contenido de botones, títulos, etiquetas) pueden permanecer en español.
- Los 44 tests que estaban fallando pasan en verde.

### CA-2: `book-search.store.ts` — `DEFAULT_PAGINATION.limit`
- El valor de `DEFAULT_PAGINATION.limit` está alineado entre el store y su spec (ya sea `25` o `50`).
- Todos los tests del store pasan.

### CA-3: `book-table.component.ts` — uso de `<app-truncated-text>`
- El componente usa `<app-truncated-text>` para renderizar las descripciones de libros, tal y como esperan los tests.
- Todos los tests de `book-table.component.spec.ts` pasan.

### CA-4: Linter limpio
- `npm run lint` en `apps/web-client` produce 0 errores y 0 warnings.
- Los 4 archivos con errores de formato Prettier están corregidos.
- El `<button>` de `book-description-dialog.component.ts` tiene contenido accesible.

### CA-5: Sin regresiones
- El número total de tests que pasan no disminuye respecto al estado previo.
- El build de TypeScript (`npm run build`) finaliza sin errores.

---

## Diagnóstico detallado

### Tests fallando por archivo

| Archivo | Tests fallando | Causa raíz |
|---|---|---|
| `language-flag.component.ts` | ~10 | `LANGUAGE_MAP` con nombres en español + prefijo `'Idioma: '` en lugar de `'Language: '` |
| `format-icon.component.ts` | 1 | Prefijo `'Formato: '` en lugar de `'Format: '` |
| `theme-toggle.component.ts` | 3 | `aria-label` botones: `'Modo claro'`/`'Modo oscuro'`/`'Selección de tema'` en lugar de inglés |
| `book-card.component.ts` | 2 | Botón Kindle: `aria-label="Enviar a Kindle"` en lugar de `"Send to Kindle"` |
| `paginator.component.ts` | 5 | `rangeLabel()` en español + `aria-label="Paginación"` + `aria-label="Cargar más elementos"` |
| `semantic-search.component.ts` | 2 | `aria-label="Búsqueda semántica"` y `aria-label="Limpiar búsqueda"` |
| `send-to-kindle-dialog.component.ts` | 5 | Textos de botones (`'Cancelar'`, `'Enviar'`) + mensajes de error + `aria-label` del input email |
| `empty-state.component.ts` | 6 | `STATE_CONFIGS` con títulos y descripciones en español |
| `loading-overlay.component.ts` | 1 | Fallback `aria-label`: `'Cargando'` en lugar de `'Loading'` |
| `book-table.component.ts` | 5 | `aria-label="Libros"` + `aria-label="Enviar a Kindle"` + ausencia de `<app-truncated-text>` |
| `multi-select-chips.component.ts` | 1 | Chip remove: `aria-label="Eliminar X"` en lugar de prefijo `'Remove '` |
| `text-filter-input.component.ts` | 1 | Clear button: `aria-label="Limpiar filtro"` en lugar de `'Clear filter'` |
| `book-search.store.ts` | 3 | `DEFAULT_PAGINATION.limit = 25` pero spec espera `50` |

### Errores de linter por archivo

| Archivo | Regla | Descripción |
|---|---|---|
| `level-badge.component.ts` | `prettier/prettier` | Atributos HTML inline, deben ir en líneas separadas |
| `book-description-dialog.component.ts` | `@angular-eslint/template/elements-content` | `<button>` sin contenido accesible |
| `send-to-kindle-dialog.component.ts` | `prettier/prettier` | 2 líneas con formato incorrecto |
| `searchable-select.component.ts` | `prettier/prettier` | Imports inline, deben ir en líneas separadas |

---

## Tareas técnicas

### Tarea 1 — Corrección de `aria-label` en componentes de data-display y shared
**Branch**: `task/HU-034-01-aria-labels-data-display`

Componentes afectados:
- [ ] `language-flag.component.ts`: cambiar `LANGUAGE_MAP` a nombres en inglés (`'English'`, `'Spanish'`…) y prefijo `'Language: '`.
- [ ] `format-icon.component.ts`: prefijo `'Format: '`.
- [ ] `theme-toggle.component.ts`: `'Light mode'` / `'Dark mode'` / `'Theme selection'`.
- [ ] `loading-overlay.component.ts`: fallback `'Loading'`.
- [ ] Verificar que los tests de estos componentes pasan.

### Tarea 2 — Corrección de `aria-label` en componentes de filtros
**Branch**: `task/HU-034-02-aria-labels-filters`

Componentes afectados:
- [ ] `semantic-search.component.ts`: `'Semantic search'` / `'Clear search'`.
- [ ] `multi-select-chips.component.ts`: prefijo `'Remove '` en chip remove button.
- [ ] `text-filter-input.component.ts`: `'Clear filter'`.
- [ ] Verificar que los tests de estos componentes pasan.

### Tarea 3 — Corrección de `aria-label` y textos en componentes de tabla y diálogos
**Branch**: `task/HU-034-03-aria-labels-table-dialogs`

Componentes afectados:
- [ ] `book-card.component.ts`: `aria-label="Send to Kindle"`.
- [ ] `paginator.component.ts`: `rangeLabel()` en inglés + `aria-label="Pagination"` + `aria-label="Load more items"`.
- [ ] `send-to-kindle-dialog.component.ts`: textos de botones en inglés + mensajes de error en inglés + `aria-label` del input en inglés.
- [ ] `empty-state.component.ts`: `STATE_CONFIGS` con títulos y descripciones en inglés.
- [ ] Verificar que los tests de estos componentes pasan.

### Tarea 4 — Corrección estructural de `book-table.component.ts`
**Branch**: `task/HU-034-04-book-table-truncated-text`

- [ ] Leer `book-table.component.spec.ts` completo para entender el contrato exacto del test.
- [ ] Actualizar `book-table.component.ts` para usar `<app-truncated-text>` en la celda de descripción.
- [ ] Corregir `aria-label="Books"` en la tabla y `aria-label="Send to Kindle"` en el botón.
- [ ] Verificar que todos los tests de `book-table.component.spec.ts` pasan.

### Tarea 5 — Corrección de `DEFAULT_PAGINATION.limit` en el store
**Branch**: `task/HU-034-05-default-pagination-limit`

- [ ] Leer `book-search.store.ts` y `book-search.store.spec.ts` completos.
- [ ] Determinar el valor correcto del limit (analizar el uso real en la aplicación).
- [ ] Alinear store y spec en el valor acordado.
- [ ] Verificar que los 3 tests del store que fallaban ahora pasan.

### Tarea 6 — Corrección de errores de linter
**Branch**: `task/HU-034-06-lint-fixes`

- [ ] `level-badge.component.ts`: aplicar formato Prettier (atributos en líneas separadas).
- [ ] `book-description-dialog.component.ts`: añadir contenido accesible al `<button>` vacío.
- [ ] `send-to-kindle-dialog.component.ts`: aplicar formato Prettier (2 líneas afectadas).
- [ ] `searchable-select.component.ts`: aplicar formato Prettier (imports en líneas separadas).
- [ ] Ejecutar `npm run lint:fix` y verificar 0 errores y 0 warnings.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `docs/user_stories/31-hu-034-web-client-test-and-lint-fixes.md` | Nuevo (este documento) |
| `apps/web-client/src/app/catalog/components/data-display/language-flag/language-flag.component.ts` | `LANGUAGE_MAP` + prefijo aria-label |
| `apps/web-client/src/app/catalog/components/data-display/format-icon/format-icon.component.ts` | Prefijo aria-label |
| `apps/web-client/src/app/catalog/components/data-display/level-badge/level-badge.component.ts` | Formato Prettier |
| `apps/web-client/src/app/shared/components/theme-toggle/theme-toggle.component.ts` | 3 aria-labels |
| `apps/web-client/src/app/catalog/components/table/loading-overlay/loading-overlay.component.ts` | Fallback aria-label |
| `apps/web-client/src/app/catalog/components/filters/semantic-search/semantic-search.component.ts` | 2 aria-labels |
| `apps/web-client/src/app/catalog/components/filters/multi-select-chips/multi-select-chips.component.ts` | Chip remove aria-label |
| `apps/web-client/src/app/catalog/components/filters/text-filter-input/text-filter-input.component.ts` | Clear button aria-label |
| `apps/web-client/src/app/catalog/components/filters/searchable-select/searchable-select.component.ts` | Formato Prettier |
| `apps/web-client/src/app/catalog/components/table/book-card/book-card.component.ts` | Kindle aria-label |
| `apps/web-client/src/app/catalog/components/table/paginator/paginator.component.ts` | rangeLabel + 2 aria-labels |
| `apps/web-client/src/app/catalog/components/table/empty-state/empty-state.component.ts` | STATE_CONFIGS en inglés |
| `apps/web-client/src/app/catalog/components/table/book-table/book-table.component.ts` | aria-labels + app-truncated-text |
| `apps/web-client/src/app/catalog/components/dialogs/send-to-kindle-dialog/send-to-kindle-dialog.component.ts` | Textos + aria-label + Prettier |
| `apps/web-client/src/app/catalog/components/dialogs/book-description-dialog/book-description-dialog.component.ts` | Button sin contenido |
| `apps/web-client/src/app/core/services/book-search.store.ts` | DEFAULT_PAGINATION.limit |

---

## Definition of Done

- [ ] 0 tests fallando en el cliente web (todos los tests en verde).
- [ ] 0 errores de lint, 0 warnings (`npm run lint` limpio).
- [ ] Build de TypeScript sin errores (`npm run build`).
- [ ] Los `aria-label` de todos los componentes están en inglés.
- [ ] `book-table.component.ts` usa `<app-truncated-text>` para descripciones.
- [ ] `DEFAULT_PAGINATION.limit` alineado entre store y spec.
- [ ] Commits realizados con el estándar Conventional Commits.
- [ ] PR de la rama `feature/HU-034-...` hacia `dev` creado para revisión.

---

**Historia creada**: Viernes, 6 de Marzo, 2026  
**Estimación**: 4 horas  
**Prioridad**: Alta  
**Complejidad**: Media
