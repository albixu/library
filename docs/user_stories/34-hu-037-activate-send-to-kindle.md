# HU-037: Activar funcionalidades de UI y conectar "Enviar a Kindle"

## Descripción

**Como** usuario de la biblioteca digital,  
**Quiero** poder enviar un libro a mi Kindle directamente desde la tabla de libros,  
**Para** poder leerlo en mi dispositivo sin pasos manuales adicionales.

---

## Contexto y motivación

En HU-035 se ocultaron tres elementos de UI porque sus funcionalidades de backend no estaban implementadas. Tras completar HU-036 (envío de libros por email), el panorama ha cambiado:

| Elemento | Estado previo (HU-035) | Acción en esta HU |
|---|---|---|
| `header.component` — icono de usuario `account_circle` | Comentado | **Descomentar** — se mostrará aunque sin funcionalidad, preparando la futura HU de gestión de usuarios |
| `book-list-page.component` — `div.results-actions` (botones "Exportar" y "Añadir Nuevo Libro") | Comentado | **Eliminar definitivamente** — no forman parte del roadmap cercano |
| `book-table.component` — columna "Acciones" con botón "Enviar a Kindle" | Comentado | **Descomentar e implementar** — conectar con el endpoint `POST /api/books/:id/send` (HU-036) |

El flujo de "Enviar a Kindle" requiere que el usuario introduzca su dirección de email de Kindle. Se implementará mediante un diálogo modal de confirmación que solicite el email antes de realizar el envío.

---

## Criterios de Aceptación

### CA-1: Icono de usuario visible en el header
- El `div.header__avatar` está descomentado en `header.component`.
- El icono `account_circle` es visible en la UI.
- No tiene funcionalidad activa (sin navegación ni acción) — es decorativo hasta la HU de gestión de usuarios.
- Los tests de `header.component.spec.ts` siguen pasando.

### CA-2: Botones "Exportar" y "Añadir Nuevo Libro" eliminados permanentemente
- El `div.results-actions` y su contenido están **eliminados** (no comentados) de `book-list-page.component`.
- Los tests de `book-list-page.component.spec.ts` siguen pasando.

### CA-3: Columna "Acciones" visible en la tabla
- El `<th>Acciones</th>` está descomentado y visible en `book-table.component`.
- La `<td>` con el botón "Enviar a Kindle" está descomentada y visible.
- Los estilos `.actions-column` y `.action-button` están descomentados.

### CA-4: Flujo "Enviar a Kindle" funcional
- Al pulsar el botón "Enviar a Kindle" en una fila, se abre un modal de confirmación.
- El modal muestra el título del libro y solicita la dirección de email destino.
- El campo de email tiene validación de formato (email válido requerido).
- Al confirmar, se llama al endpoint `POST /api/books/:id/send` con el `id` del libro y el `email` introducido.
- Durante el envío, el botón muestra un estado de carga (spinner o disabled).
- Si el envío es exitoso → se cierra el modal y se muestra un mensaje de éxito (toast/snackbar).
- Si el servidor responde con error → se muestra un mensaje de error descriptivo sin cerrar el modal.
- Al cancelar, el modal se cierra sin realizar ninguna llamada.

### CA-5: Servicio HTTP para el endpoint de envío
- Existe un método en el servicio Angular correspondiente que llama a `POST /api/books/:id/send`.
- El método recibe `bookId: string` y `email: string` y retorna un `Observable`.

### CA-6: Sin regresiones
- `npm run lint` en `apps/web-client` produce 0 errores y 0 warnings.
- El número total de tests que pasan no disminuye respecto al estado previo.
- Cobertura mínima del 80% en los componentes nuevos o modificados.

---

## Diseño del modal

El modal debe ser simple y funcional:

```
┌─────────────────────────────────────────┐
│  Enviar a Kindle                         │
├─────────────────────────────────────────┤
│  "{título del libro}"                   │
│                                         │
│  Email de Kindle:                       │
│  ┌─────────────────────────────────┐    │
│  │ usuario@kindle.com              │    │
│  └─────────────────────────────────┘    │
│                                         │
│           [Cancelar]  [Enviar]          │
└─────────────────────────────────────────┘
```

- Implementar como componente Angular standalone o usando el patrón de diálogos ya existente en el proyecto.
- Explorar si hay un componente de modal/dialog reutilizable antes de crear uno nuevo.

---

## Tareas técnicas

### Tarea 1 — Descomentar icono de usuario y eliminar botones de acción
**Branch**: `task/HU-037-01-restore-header-and-cleanup-actions`

- [ ] Descomentar el `div.header__avatar` en `header.component`.
- [ ] **Eliminar** (no comentar) el `div.results-actions` completo de `book-list-page.component`.
- [ ] Verificar que `header.component.spec.ts` y `book-list-page.component.spec.ts` siguen pasando.

### Tarea 2 — Descomentar columna "Acciones" en la tabla
**Branch**: `task/HU-037-02-restore-actions-column`

- [ ] Descomentar el `<th>Acciones</th>` en `book-table.component`.
- [ ] Descomentar la `<td class="actions-column text-right">` con el botón "Enviar a Kindle".
- [ ] Descomentar los estilos `.actions-column` y `.action-button`.
- [ ] Verificar que `book-table.component.spec.ts` sigue pasando.

### Tarea 3 — Servicio HTTP: método sendBookByEmail
**Branch**: `task/HU-037-03-book-send-service`

- [ ] Localizar el servicio Angular que gestiona las llamadas HTTP a la API de libros (p.ej. `BookApiService` o similar).
- [ ] Añadir método `sendBookByEmail(bookId: string, email: string): Observable<void>` que llame a `POST /api/books/:id/send`.
- [ ] Tests unitarios del método con `HttpClientTestingModule`.

### Tarea 4 — Modal de confirmación "Enviar a Kindle"
**Branch**: `task/HU-037-04-send-to-kindle-modal`

- [ ] Explorar si existe un componente de modal/dialog reutilizable en el proyecto; si no, crear `SendToKindleDialogComponent`.
- [ ] El modal recibe el título del libro como input.
- [ ] Contiene un `FormControl` para el email con validación `Validators.email` + `Validators.required`.
- [ ] Emite el email confirmado o cierra sin emitir al cancelar.
- [ ] Tests unitarios del componente del modal.

### Tarea 5 — Integrar modal en book-table y conectar con el servicio
**Branch**: `task/HU-037-05-integrate-send-flow`

- [ ] Al pulsar "Enviar a Kindle" en `book-table.component`, abrir el modal con el título del libro.
- [ ] Al confirmar en el modal, llamar al servicio `sendBookByEmail(book.id, email)`.
- [ ] Gestionar el estado de carga (deshabilitar botón/spinner durante el envío).
- [ ] Al éxito → cerrar modal y mostrar notificación de éxito (usar el mecanismo de toast/notificación existente en el proyecto, o crear uno simple).
- [ ] Al error → mostrar mensaje de error dentro del modal sin cerrarlo.
- [ ] Tests unitarios e integración del flujo completo.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `docs/user_stories/34-hu-037-activate-send-to-kindle.md` | Nuevo (este documento) |
| `apps/web-client/src/app/layout/header/header.component.ts` | Descomentar `div.header__avatar` |
| `apps/web-client/src/app/catalog/pages/book-list/book-list-page.component.ts` | Eliminar `div.results-actions` |
| `apps/web-client/src/app/catalog/components/table/book-table/book-table.component.ts` | Descomentar columna acciones + integrar flujo |
| `apps/web-client/src/app/catalog/services/` (o similar) | Añadir método `sendBookByEmail` |
| `apps/web-client/src/app/catalog/components/` (o similar) | Nuevo componente `SendToKindleDialogComponent` |

---

## Definition of Done

- [ ] Icono de usuario visible en el header.
- [ ] `div.results-actions` eliminado permanentemente de `book-list-page`.
- [ ] Columna "Acciones" visible con botón "Enviar a Kindle" funcional.
- [ ] Modal de confirmación operativo con validación de email.
- [ ] Llamada al endpoint `POST /api/books/:id/send` correctamente integrada.
- [ ] Estados de carga y error gestionados en la UI.
- [ ] 0 errores de lint, 0 warnings.
- [ ] Todos los tests del cliente web siguen en verde, cobertura ≥ 80% en código nuevo.
- [ ] Commits con estándar Conventional Commits.
- [ ] PR de `feature/HU-037-...` hacia `dev` creado para revisión.

---

**Historia creada**: Viernes, 1 de Mayo, 2026
**Estimación**: 3-4 horas
**Prioridad**: Alta
**Complejidad**: Media
