# HU-043 — Navegación Responsive para Mobile y Tablet

## Metadata

| Campo         | Valor                                              |
|---------------|----------------------------------------------------|
| **ID**        | HU-043                                             |
| **Épica**     | UI / Experiencia de usuario                        |
| **Prioridad** | Alta                                               |
| **Estado**    | Pendiente                                          |
| **Rama**      | `feature/HU-043-responsive-mobile-nav`             |

---

## Historia de Usuario

**Como** usuario de la biblioteca digital que accede desde un dispositivo móvil o tablet,
**quiero** disponer de una barra de navegación inferior y una cabecera simplificada,
**para** navegar cómodamente por la aplicación con una sola mano y aprovechar al máximo el espacio de pantalla disponible.

---

## Contexto y Motivación

La aplicación funciona correctamente en desktop, pero en mobile y tablet el header horizontal no se adapta: los enlaces de navegación y el botón de autenticación quedan amontonados o desaparecen sin alternativa. El panel de filtros ya dispone de un drawer funcional en mobile (implementado en HU-042), por lo que esta historia se centra exclusivamente en la navegación global.

El patrón elegido es **bottom navigation bar**: una barra fija en la parte inferior de la pantalla de 56px de alto, con iconos y etiquetas, que sustituye a los controles de navegación y autenticación del header en dispositivos móviles y tablets. Este patrón es el estándar nativo en aplicaciones móviles modernas (Material Design, iOS HIG) y maximiza la ergonomía con el pulgar.

El breakpoint de mobile/tablet ya está definido en el proyecto mediante `BreakpointObserver` de Angular CDK (`Breakpoints.XSmall + Small`, equivalente a `max-width: 959px`) y se usa como señal reactiva `isMobile()` en `BookListPageComponent`. Esta lógica se elevará al `MainLayoutComponent` para compartirla con el header y el nuevo bottom nav.

---

## Criterios de Aceptación

### CA-01 — Desktop sin cambios (ancho > 959px)
- **Dado** que el usuario accede desde un dispositivo con ancho superior a 959px,
- **cuando** carga cualquier página de la aplicación,
- **entonces** el header muestra su contenido completo (marca, enlaces de navegación, botón de autenticación) y no aparece ninguna barra de navegación inferior.

### CA-02 — Bottom nav visible en mobile/tablet (ancho <= 959px)
- **Dado** que el usuario accede desde un dispositivo con ancho igual o inferior a 959px,
- **cuando** carga cualquier página de la aplicación,
- **entonces** aparece una barra de navegación fija en la parte inferior de la pantalla de 56px de alto.

### CA-03 — Contenido del bottom nav cuando el usuario está autenticado
- **Dado** que el usuario tiene sesión iniciada y está en mobile/tablet,
- **cuando** observa la barra de navegación inferior,
- **entonces** ve tres elementos:
  - "Catálogo" con icono `menu_book` — navega a `/books`
  - "Para ti" con icono `recommend` — navega a `/recommendations`
  - Avatar/email con icono de logout — abre el dropdown de cierre de sesión

### CA-04 — Contenido del bottom nav cuando el usuario no está autenticado
- **Dado** que el usuario no tiene sesión iniciada y está en mobile/tablet,
- **cuando** observa la barra de navegación inferior,
- **entonces** ve únicamente el botón de "Iniciar sesión" con icono `account_circle`, que abre el modal de login existente.

### CA-05 — Header simplificado en mobile/tablet
- **Dado** que el usuario accede desde mobile/tablet,
- **cuando** observa el header superior,
- **entonces** solo ve la marca (logo + nombre "BiblioManager") y los enlaces de navegación y el botón de autenticación están ocultos (trasladados al bottom nav).

### CA-06 — El contenido principal no queda tapado por el bottom nav
- **Dado** que el bottom nav está visible (mobile/tablet),
- **cuando** el usuario hace scroll hasta el final de cualquier página,
- **entonces** el último elemento de contenido visible no queda oculto detrás de la barra inferior (el layout aplica un `padding-bottom` de 56px en mobile).

### CA-07 — El drawer de filtros no queda tapado por el bottom nav
- **Dado** que el usuario está en la página de catálogo en mobile,
- **cuando** abre el drawer de filtros,
- **entonces** el drawer se superpone correctamente sobre el bottom nav (z-index adecuado) y el backdrop cubre toda la pantalla incluyendo la zona del bottom nav.

### CA-08 — El elemento activo del bottom nav está destacado visualmente
- **Dado** que el usuario está en una página con entrada en el bottom nav,
- **cuando** observa la barra inferior,
- **entonces** el elemento correspondiente a la página actual aparece destacado visualmente (color accent `#17a1cf`), igual que el comportamiento de `routerLinkActive` en el header de desktop.

---

## Tareas Técnicas

### T1 — Crear `BottomNavComponent`
- Componente standalone en `src/app/layout/bottom-nav/`.
- Recibe la señal `isMobile()` como `input()` o la consume desde un servicio compartido.
- Renderiza los elementos de navegación con `routerLink` y `routerLinkActive`.
- Gestiona el estado de autenticación (mismo patrón que el header: `AuthService.currentUser()`).
- El botón de logout reutiliza la lógica existente del header.
- El botón de login abre `LoginModalComponent` vía CDK Dialog (mismo patrón que el header).
- `display: none` en desktop, `display: flex` en mobile (controlado por `@if (isMobile())`).
- Tests unitarios: visibilidad según autenticación, active state, emit de acciones.

### T2 — Elevar la señal `isMobile()` al `MainLayoutComponent`
- Mover/duplicar el `BreakpointObserver` al `MainLayoutComponent` o crear un `LayoutService` inyectable que exponga `isMobile()` como signal.
- `BookListPageComponent` pasa a consumirlo del servicio en lugar de instanciarlo localmente.
- El `HeaderComponent` y el nuevo `BottomNavComponent` también lo consumen del mismo servicio.
- Tests unitarios del servicio.

### T3 — Actualizar `HeaderComponent`
- Inyectar `LayoutService` (o la señal `isMobile()`).
- Envolver los enlaces de navegación y el bloque de autenticación en `@if (!isMobile())`.
- El bloque de la marca siempre es visible.
- Actualizar tests existentes del header.

### T4 — Actualizar `MainLayoutComponent`
- Instanciar `BottomNavComponent` en el template.
- Aplicar `padding-bottom: 56px` al contenedor `main-layout__content` condicionalmente cuando `isMobile()` es `true`.
- Tests unitarios: verificar padding dinámico y presencia del bottom nav.

### T5 — Ajuste de z-index y verificación visual
- Revisar que el z-index del bottom nav (propuesta: `z-index: 40`) no interfiera con:
  - El drawer de filtros de `BookListPageComponent` (actualmente `z-index: 50`)
  - El backdrop del drawer (`z-index: 49` aproximado)
  - El header sticky (`z-index: 100` aproximado)
- Verificar en breakpoints: 320px, 480px, 768px, 959px, 1024px.
- Ejecutar ESLint y corregir todos los warnings/errores.
- Verificar que todos los tests pasan.

---

## Notas Técnicas

- **No duplicar el BreakpointObserver**: la lógica de detección de mobile debe vivir en un único lugar (`LayoutService` o elevada al `MainLayoutComponent`). Actualmente vive en `BookListPageComponent`; se refactorizará en T2.
- **Sin cambios en el panel de filtros**: el drawer ya funciona correctamente en mobile. Solo se ajusta el z-index si es necesario (T5).
- **Bottom nav height**: 56px, estándar de Material Design. Esta constante debe ser definida como variable CSS (`--bottom-nav-height: 56px`) para que el padding del layout la consuma sin duplicar el valor.
- **Reutilización de lógica de auth**: `BottomNavComponent` no reimplementa la lógica de login/logout — delega al mismo `AuthService` y al mismo `LoginModalComponent` que usa el header.
- **Sin cambios en routing**: no se modifica ninguna ruta.

---

## Definición de Hecho (DoD)

- [ ] `BottomNavComponent` implementado y con tests.
- [ ] `LayoutService` (o señal elevada) implementado y consumido por header, bottom nav y book-list-page.
- [ ] `HeaderComponent` oculta navegación y auth en mobile.
- [ ] `MainLayoutComponent` renderiza el bottom nav y aplica padding dinámico.
- [ ] El drawer de filtros no queda tapado ni interfiere con el bottom nav.
- [ ] El elemento activo del bottom nav está visualmente destacado.
- [ ] Verificación visual en 320px, 480px, 768px, 959px y 1024px.
- [ ] Cobertura de tests: mínimo 80% en componentes y servicios nuevos.
- [ ] ESLint: 0 errores, 0 warnings.
- [ ] TypeCheck: sin errores de tipos.
- [ ] Documentación en Notion actualizada:
  - `Developer Documentation`: nuevo `BottomNavComponent`, `LayoutService`, cambios en `HeaderComponent` y `MainLayoutComponent`.
  - `Product Overview`: HU-043 marcada como completada.
