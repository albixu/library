# HU-042 — Vista en Cards del Listado de Libros

## Metadata

| Campo         | Valor                                           |
|---------------|-------------------------------------------------|
| **ID**        | HU-042                                          |
| **Épica**     | UI / Experiencia de usuario                     |
| **Prioridad** | Media                                           |
| **Estado**    | Pendiente                                       |
| **Rama**      | `feature/HU-042-book-card-view`                 |

---

## Historia de Usuario

**Como** usuario de la biblioteca digital,
**quiero** poder visualizar el catálogo de libros en formato de cards distribuidas en un grid responsive,
**para** tener una vista más visual e intuitiva sin necesidad de hacer scroll horizontal en ningún tamaño de pantalla.

---

## Contexto y Motivación

El listado actual usa una tabla con múltiples columnas que fuerza scroll horizontal en pantallas medianas y pequeñas, degradando la experiencia de usuario. El nuevo diseño propone un grid de cards donde cada libro se representa visualmente con su portada, datos esenciales y acciones directas. El layout se adapta dinámicamente al espacio disponible (CSS Grid con `auto-fill`), sin scroll horizontal en ningún breakpoint.

El diseño de referencia incluye también un **toggle** en la cabecera del área de contenido para que el usuario pueda alternar entre la vista tabla (existente) y la nueva vista cards.

La API actual no provee imagen de portada. En esta historia se usará un **placeholder visual fijo** (imagen oscura genérica, consistente con el diseño). El componente quedará preparado para aceptar una URL de imagen cuando la API la provea en el futuro.

---

## Criterios de Aceptación

### CA-01 — Toggle de vista en la cabecera
- **Dado** que el usuario está en la página de listado de libros,
- **cuando** visualiza la cabecera del área de contenido (junto al título "Tu Biblioteca Digital"),
- **entonces** ve dos botones de toggle: uno para vista tabla (icono de tabla) y otro para vista cards (icono de grid), con el activo destacado visualmente.

### CA-02 — Vista cards es la vista por defecto
- **Dado** que el usuario accede a la página de listado de libros,
- **cuando** carga por primera vez (sin preferencia guardada),
- **entonces** el listado se muestra en vista cards.

### CA-03 — Estructura de la card de libro
- **Dado** que el listado está en vista cards,
- **cuando** hay resultados,
- **entonces** cada card muestra:
  - Imagen de portada (área superior, ratio fijo): placeholder visual fijo mientras la API no provea URL
  - Badge de idioma en la esquina superior izquierda (código de idioma + bandera/emoji)
  - Icono de favorito (corazón) en la esquina superior derecha — solo visual, sin funcionalidad en esta HU
  - Título del libro (truncado con ellipsis si es largo) + icono `ⓘ` que al hacer hover muestra el título completo en tooltip
  - Nombre del autor
  - ISBN
  - Badge de nivel/categoría con el mismo sistema de colores que la vista tabla
  - Botón "Send to Kindle" — solo visible si `available === true`, con el mismo comportamiento que en la vista tabla

### CA-04 — Grid responsive sin scroll horizontal
- **Dado** que el usuario redimensiona la ventana del navegador,
- **cuando** el ancho disponible no permite encajar una columna más,
- **entonces** las cards fluyen a la siguiente fila automáticamente (CSS wrap), sin desbordamiento horizontal en ningún breakpoint.

### CA-05 — Ancho de card
- **Dado** que el grid es responsive,
- **cuando** se calcula el layout,
- **entonces** cada card tiene un ancho mínimo de **180px** y un máximo de **240px**, creciendo para llenar el espacio disponible entre esos límites (`minmax(180px, 1fr)`).

### CA-06 — La vista tabla sigue funcionando
- **Dado** que el usuario selecciona la vista tabla desde el toggle,
- **cuando** cambia la vista,
- **entonces** el listado se muestra como la tabla actual sin pérdida de datos ni estado de filtros.

### CA-07 — La preferencia de vista se persiste en sesión
- **Dado** que el usuario selecciona una vista (cards o tabla),
- **cuando** navega a otra página y regresa,
- **entonces** se mantiene la última vista seleccionada (persistida en `localStorage`).

### CA-08 — Estados de carga y vacío en vista cards
- **Dado** que la API está cargando o no hay resultados,
- **cuando** el listado está en vista cards,
- **entonces** se muestran estados equivalentes a los de la vista tabla:
  - **Loading**: skeleton de cards animado (placeholder con forma de card)
  - **Sin resultados**: mismo empty state actual
  - **Error**: mismo estado de error actual

### CA-09 — La paginación funciona en vista cards
- **Dado** que hay más resultados de los que caben en una página,
- **cuando** el listado está en vista cards,
- **entonces** el paginador existente funciona de forma idéntica a como lo hace en la vista tabla.

---

## Tareas Técnicas

### T1 — Crear `BookCardComponent`
- Componente presentacional que recibe un `Book` como `@Input()`.
- Renderiza la estructura visual definida en CA-03.
- La imagen de portada usa un placeholder fijo; el componente acepta un `@Input() coverUrl?: string` para uso futuro.
- El icono de favorito es puramente visual (sin lógica) en esta HU.
- El tooltip del título se implementa con la directiva `matTooltip` de Angular Material.
- Output event `sendToKindle` que emite el libro al componente padre.
- Tests unitarios.

### T2 — Crear `BookCardGridComponent`
- Componente presentacional que recibe `Book[]` como `@Input()`.
- Renderiza el grid con CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`.
- Sin `overflow-x` en ningún caso.
- Propaga el evento `sendToKindle` hacia arriba.
- Tests unitarios.

### T3 — Implementar el toggle de vista en `BookListPageComponent`
- Añadir estado `viewMode: 'table' | 'cards'` al store/signals existente.
- Renderizar `BookCardGridComponent` o `BookTableComponent` según `viewMode`.
- Valor inicial: `'cards'`.
- Persistir la preferencia en `localStorage` bajo la clave `book-list-view-mode`.
- Recuperar la preferencia al inicializar el componente.
- Tests unitarios del toggle y de la persistencia.

### T4 — Implementar skeleton de carga para vista cards
- Crear un estado de carga específico para la vista cards: N cards fantasma con animación pulse.
- El número de skeletons mostrados debe ser coherente con el tamaño de página activo.
- Tests unitarios del estado de carga.

### T5 — Verificación visual y limpieza
- Verificar en diferentes anchos de pantalla (320px, 768px, 1024px, 1440px) que no hay scroll horizontal.
- Verificar que la vista tabla no presenta regresiones.
- Ejecutar ESLint y corregir todos los warnings y errores.
- Verificar que todos los tests pasan.

---

## Diseños de Referencia

| Recurso                        | Ubicación                                                     |
|--------------------------------|---------------------------------------------------------------|
| Vista desktop completa         | `docs/web/designs/gestor_libros_desktop_final/screen.png`     |
| Detalle de card individual     | `docs/web/designs/card_libro.png`                             |
| Vista desktop con toggle       | `docs/web/designs/desktop.png`                                |

---

## Definición de Hecho (DoD)

- [ ] El toggle tabla/cards está implementado y funciona correctamente.
- [ ] La vista cards es el modo por defecto al cargar la página.
- [ ] Las cards muestran todos los datos definidos en CA-03.
- [ ] El grid es responsive y nunca genera scroll horizontal en ningún breakpoint.
- [ ] La preferencia de vista se persiste en `localStorage`.
- [ ] El skeleton de carga en vista cards está implementado.
- [ ] Los estados vacío y error funcionan en vista cards.
- [ ] La paginación funciona en vista cards.
- [ ] La vista tabla sigue funcionando sin regresiones.
- [ ] Cobertura de tests: mínimo 80% en componentes nuevos.
- [ ] ESLint: 0 errores, 0 warnings.
- [ ] TypeCheck: sin errores de tipos.
- [ ] Documentación en Notion actualizada:
  - `Developer Documentation`: nuevos componentes (`BookCardComponent`, `BookCardGridComponent`) y cambios en `BookListPageComponent`.
  - `Product Overview`: HU-042 marcada como completada.
