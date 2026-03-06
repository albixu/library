# HU-035: Ocultar funcionalidades no implementadas para la MVP

## Descripción

**Como** desarrollador del proyecto,  
**Quiero** comentar los elementos de UI que todavía no están implementados,  
**Para** evitar que generen ruido visual o confusión en la MVP, dejando un `TODO` claro en cada bloque comentado para poder reactivarlos fácilmente en el futuro.

---

## Contexto y motivación

El cliente web tiene varios elementos de interfaz que están maquetados pero cuya funcionalidad de backend no existe todavía. Mostrarlos al usuario en este estado genera confusión y una experiencia degradada. La solución es comentar el HTML de cada elemento con un `TODO` descriptivo, de forma que:

1. No sean visibles en la UI.
2. Sean fáciles de encontrar y reactivar cuando se implemente la funcionalidad correspondiente.

---

## Elementos a ocultar

| # | Componente | Elemento | Motivo |
|---|---|---|---|
| 1 | `header.component.ts` | `div.header__avatar` — icono de usuario (`account_circle`) | La gestión de usuarios/perfil no está implementada |
| 2 | `book-list-page.component.ts` | `div.results-actions` — botones "Exportar" y "Añadir Nuevo Libro" | La exportación de catálogo y la creación manual de libros desde la UI no están implementadas |
| 3 | `book-table.component.ts` | Columna "Acciones" completa — `<th>`, `<td>` con botón "Enviar a Kindle" y estilos asociados | El flujo de envío a Kindle no está integrado en la MVP |

---

## Criterios de Aceptación

### CA-1: Icono de usuario oculto en el header
- El `div.header__avatar` está comentado en la plantilla de `header.component.ts`.
- El comentario incluye un `TODO` indicando que se debe descomentar cuando se implemente la gestión de usuarios.
- El icono de usuario **no es visible** en la UI.
- Los tests de `header.component.spec.ts` siguen pasando.

### CA-2: Botones "Exportar" y "Añadir Nuevo Libro" ocultos
- El `div.results-actions` completo (ambos botones) está comentado en la plantilla de `book-list-page.component.ts`.
- El comentario incluye un `TODO` indicando que se debe descomentar cuando se implemente la exportación del catálogo y la creación manual de libros.
- Los botones **no son visibles** en la UI.
- Los tests de `book-list-page.component.spec.ts` siguen pasando.

### CA-3: Columna "Acciones" oculta en la tabla
- El `<th class="text-right">Acciones</th>` está comentado en la plantilla de `book-table.component.ts`.
- La `<td class="actions-column text-right">` con el botón "Enviar a Kindle" está comentada.
- Los estilos `.actions-column` y `.action-button` están comentados.
- Cada bloque comentado incluye un `TODO` indicando que se debe descomentar cuando se integre el flujo de Kindle en la MVP.
- La columna "Acciones" **no es visible** en la UI.
- Los tests de `book-table.component.spec.ts` siguen pasando.

### CA-4: Sin regresiones
- `npm run lint` en `apps/web-client` produce 0 errores y 0 warnings.
- El build de TypeScript (`npm run build`) finaliza sin errores.
- El número total de tests que pasan no disminuye respecto al estado previo.

---

## Tareas técnicas

### Tarea 1 — Ocultar icono de usuario en el header
**Branch**: `task/HU-035-01-hide-user-avatar`

- [ ] Comentar el `div.header__avatar` en la plantilla de `header.component.ts` con un `TODO` descriptivo.
- [ ] Verificar que `header.component.spec.ts` sigue pasando.

### Tarea 2 — Ocultar botones "Exportar" y "Añadir Nuevo Libro"
**Branch**: `task/HU-035-02-hide-action-buttons`

- [ ] Comentar el `div.results-actions` completo en la plantilla de `book-list-page.component.ts` con un `TODO` descriptivo.
- [ ] Verificar que `book-list-page.component.spec.ts` sigue pasando.

### Tarea 3 — Ocultar columna "Acciones" en la tabla de libros
**Branch**: `task/HU-035-03-hide-actions-column`

- [ ] Comentar el `<th class="text-right">Acciones</th>` en la plantilla de `book-table.component.ts` con un `TODO` descriptivo.
- [ ] Comentar la `<td class="actions-column text-right">` con el botón "Enviar a Kindle" con un `TODO` descriptivo.
- [ ] Comentar los estilos `.actions-column` y `.action-button` con un `TODO` descriptivo.
- [ ] Verificar que `book-table.component.spec.ts` sigue pasando.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `docs/user_stories/32-hu-035-hide-unimplemented-features-mvp.md` | Nuevo (este documento) |
| `apps/web-client/src/app/layout/header/header.component.ts` | Comentar `div.header__avatar` |
| `apps/web-client/src/app/catalog/pages/book-list/book-list-page.component.ts` | Comentar `div.results-actions` |
| `apps/web-client/src/app/catalog/components/table/book-table/book-table.component.ts` | Comentar `<th>`, `<td>` acciones y estilos asociados |

---

## Definition of Done

- [ ] Los 3 elementos de UI comentados no son visibles en la aplicación.
- [ ] Cada bloque comentado contiene un `TODO` descriptivo.
- [ ] 0 errores de lint, 0 warnings (`npm run lint` limpio).
- [ ] Build de TypeScript sin errores (`npm run build`).
- [ ] Todos los tests del cliente web siguen en verde.
- [ ] Commits realizados con el estándar Conventional Commits.
- [ ] PR de la rama `feature/HU-035-...` hacia `dev` creado para revisión.

---

**Historia creada**: Viernes, 6 de Marzo, 2026  
**Estimación**: 1 hora  
**Prioridad**: Media  
**Complejidad**: Baja
