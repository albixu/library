# HU-016: Layout Principal y Theme Toggle

## Descripcion

**Como** usuario de la biblioteca digital,  
**Quiero** tener un layout consistente con header, footer y la posibilidad de cambiar entre modo claro y oscuro,  
**Para** tener una experiencia de navegacion coherente y personalizada segun mis preferencias visuales.

## Contexto

Esta historia de usuario implementa la estructura base del layout de la aplicacion que envuelve todas las paginas. Incluye un header con el logo de la aplicacion y un toggle de tema, y un footer con informacion de copyright y enlace al repositorio de GitHub.

El tema por defecto sera el modo oscuro (dark mode), respetando las preferencias del sistema operativo del usuario si no hay una preferencia guardada en localStorage.

## Disenos de Referencia

| Dispositivo | Modo | Ubicacion |
|-------------|------|-----------|
| Desktop | Dark | `docs/web/designs/gestor_libros_-_dark_desktop/` |
| Desktop | Light | `docs/web/designs/gestor_libros_-_light_desktop/` |
| Mobile | Dark | `docs/web/designs/gestor_libros_-_dark_mobile/` |
| Mobile | Light | Adaptar colores del diseno light desktop al layout mobile |

## Documentacion Tecnica de Referencia

- **Guia de Estilos**: `docs/design_docs/03-web-client-design.md` - Seccion 5 (Paleta de colores, tipografia, CSS variables)
- **Sistema de Temas**: `docs/design_docs/03-web-client-design.md` - Seccion 6 (ThemeService)

---

## Criterios de Aceptacion

### AC-1: Header

- [ ] El header se muestra en la parte superior de la aplicacion
- [ ] Contiene el logo de la aplicacion: icono Material `auto_stories` dentro de un contenedor redondeado con fondo cyan (#17a1cf)
- [ ] Junto al logo aparece el nombre de la aplicacion "Library" en texto bold con tracking-tight
- [ ] El header contiene el toggle de tema en el lado derecho
- [ ] El header es sticky (permanece fijo al hacer scroll)
- [ ] El header tiene el mismo aspecto en desktop y mobile

### AC-2: Footer

- [ ] El footer se muestra en la parte inferior de la aplicacion
- [ ] Contiene el texto de copyright: "© 2025 Library"
- [ ] Contiene un enlace a GitHub que lleva a https://github.com/albixu/library
- [ ] El footer es sticky (siempre visible en la parte inferior)
- [ ] El footer tiene un diseno minimalista y simple

### AC-3: Theme Toggle

- [ ] El toggle de tema muestra un icono de sol (`light_mode`) cuando el tema activo es oscuro
- [ ] El toggle de tema muestra un icono de luna (`dark_mode`) cuando el tema activo es claro
- [ ] Al hacer click en el toggle, el tema cambia entre claro y oscuro
- [ ] La preferencia de tema se guarda en localStorage con la clave `library-theme`
- [ ] Si no hay preferencia guardada, se respeta la preferencia del sistema (`prefers-color-scheme`)
- [ ] Si no hay preferencia del sistema ni guardada, el tema por defecto es dark
- [ ] La transicion entre temas es suave (200-300ms)
- [ ] El toggle tiene `aria-label` apropiado para accesibilidad

### AC-4: Layout Principal

- [ ] El layout envuelve todas las paginas de la aplicacion
- [ ] La estructura es: Header → Contenido Principal (router-outlet) → Footer
- [ ] El contenido principal ocupa todo el espacio disponible entre header y footer (min-height: 100vh)
- [ ] El layout funciona correctamente en desktop y mobile
- [ ] Los componentes existentes (BookListPage) se integran sin modificaciones en el layout

### AC-5: Temas Dark/Light

- [ ] El header se adapta correctamente a ambos temas (dark y light)
- [ ] El footer se adapta correctamente a ambos temas
- [ ] Los colores siguen la guia de estilos definida en `03-web-client-design.md`
- [ ] El atributo `data-theme` se aplica correctamente en el elemento `<html>`

---

## Especificaciones Tecnicas

### Componentes a Crear

| Componente | Tipo | Descripcion | Ubicacion |
|------------|------|-------------|-----------|
| `ThemeService` | Service | Gestion del tema con Signals, localStorage y preferencias del sistema | `core/services/` |
| `ThemeToggleComponent` | Presentational | Boton con icono para alternar entre temas | `shared/components/theme-toggle/` |
| `HeaderComponent` | Presentational | Header con logo y theme toggle | `layout/header/` |
| `FooterComponent` | Presentational | Footer con copyright y enlace GitHub | `layout/footer/` |
| `MainLayoutComponent` | Smart | Layout principal que envuelve router-outlet | `layout/main-layout/` |

### Estructura de Archivos

```
apps/web-client/src/app/
├── core/
│   └── services/
│       ├── theme.service.ts
│       ├── theme.service.spec.ts
│       └── index.ts
│
├── shared/
│   └── components/
│       └── theme-toggle/
│           ├── theme-toggle.component.ts
│           ├── theme-toggle.component.spec.ts
│           └── index.ts
│
└── layout/
    ├── main-layout/
    │   ├── main-layout.component.ts
    │   ├── main-layout.component.scss
    │   ├── main-layout.component.spec.ts
    │   └── index.ts
    ├── header/
    │   ├── header.component.ts
    │   ├── header.component.scss
    │   ├── header.component.spec.ts
    │   └── index.ts
    ├── footer/
    │   ├── footer.component.ts
    │   ├── footer.component.scss
    │   ├── footer.component.spec.ts
    │   └── index.ts
    └── index.ts
```

### ThemeService API

```typescript
type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme: Signal<Theme>;
  readonly isDark: Signal<boolean>;
  
  toggleTheme(): void;
  setTheme(theme: Theme): void;
}
```

**Comportamiento:**
1. Al inicializar, verifica localStorage (`library-theme`)
2. Si no existe, verifica `window.matchMedia('(prefers-color-scheme: dark)')`
3. Si no hay preferencia, usa `'dark'` como default
4. Aplica `data-theme` al elemento `<html>` usando `effect()`
5. Persiste cambios en localStorage

### Estilos CSS Variables

Los temas ya estan definidos en `03-web-client-design.md`. Se deben implementar en `styles.scss`:

```scss
// Modo claro (cuando data-theme="light" o sin atributo)
:root {
  --color-bg-primary: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-accent: #17a1cf;
  --color-border: #e2e8f0;
  // ... resto de variables
}

// Modo oscuro
[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-bg-surface: #1e293b;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-accent: #17a1cf;
  --color-border: #334155;
  // ... resto de variables
}
```

### Header Especificaciones

```typescript
@Component({
  selector: 'app-header',
  template: `
    <header class="header">
      <div class="header__brand">
        <div class="header__logo">
          <mat-icon>auto_stories</mat-icon>
        </div>
        <span class="header__title">Library</span>
      </div>
      <app-theme-toggle />
    </header>
  `,
})
```

**Estilos del logo:**
- Contenedor: `background-color: #17a1cf`, `border-radius: 8px`, padding interno
- Icono: color blanco
- Titulo: `font-weight: 700`, `letter-spacing: -0.025em` (tracking-tight)

### Footer Especificaciones

```typescript
@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <span>© 2025 Library</span>
      <span class="footer__separator">•</span>
      <a href="https://github.com/albixu/library" 
         target="_blank" 
         rel="noopener noreferrer">
        GitHub
      </a>
    </footer>
  `,
})
```

### Transicion de Tema

```scss
// Transicion suave al cambiar de tema
:root {
  transition: background-color 250ms ease-in-out, color 250ms ease-in-out;
}

// Aplicar a elementos principales
body,
.header,
.footer,
.mat-mdc-card {
  transition: background-color 250ms ease-in-out, 
              color 250ms ease-in-out,
              border-color 250ms ease-in-out;
}
```

---

## Tareas de Implementacion

### Tarea 1: Implementar ThemeService
**Estimacion**: 1 hora

- [ ] Crear `ThemeService` en `core/services/`
- [ ] Implementar signal `theme` con logica de inicializacion (localStorage > prefers-color-scheme > dark)
- [ ] Implementar computed `isDark`
- [ ] Implementar metodo `toggleTheme()`
- [ ] Implementar metodo `setTheme(theme: Theme)`
- [ ] Implementar `effect()` para sincronizar con DOM (`data-theme`)
- [ ] Tests unitarios completos
- [ ] Exportar en barrel `index.ts`

### Tarea 2: Implementar variables CSS de temas
**Estimacion**: 0.5 horas

- [ ] Actualizar `styles.scss` con las variables CSS para modo claro (`:root`)
- [ ] Implementar variables CSS para modo oscuro (`[data-theme="dark"]`)
- [ ] Anadir transiciones suaves para cambio de tema
- [ ] Verificar que los colores coinciden con la guia de estilos

### Tarea 3: Implementar ThemeToggleComponent
**Estimacion**: 1 hora

- [ ] Crear `ThemeToggleComponent` en `shared/components/theme-toggle/`
- [ ] Implementar template con `mat-icon-button` y icono dinamico (light_mode/dark_mode)
- [ ] Inyectar `ThemeService` y usar sus signals
- [ ] Implementar `aria-label` dinamico para accesibilidad
- [ ] Tests unitarios
- [ ] Story de Storybook
- [ ] Exportar en barrel `index.ts`

### Tarea 4: Implementar HeaderComponent
**Estimacion**: 1 hora

- [ ] Crear `HeaderComponent` en `layout/header/`
- [ ] Implementar template con logo (mat-icon auto_stories), titulo y theme toggle
- [ ] Implementar estilos SCSS (sticky, colores, espaciado)
- [ ] Asegurar responsive (mismo aspecto desktop/mobile)
- [ ] Tests unitarios
- [ ] Story de Storybook
- [ ] Exportar en barrel `index.ts`

### Tarea 5: Implementar FooterComponent
**Estimacion**: 0.5 horas

- [ ] Crear `FooterComponent` en `layout/footer/`
- [ ] Implementar template con copyright y enlace GitHub
- [ ] Implementar estilos SCSS (sticky bottom, colores, espaciado)
- [ ] Tests unitarios
- [ ] Story de Storybook
- [ ] Exportar en barrel `index.ts`

### Tarea 6: Implementar MainLayoutComponent
**Estimacion**: 1 hora

- [ ] Crear `MainLayoutComponent` en `layout/main-layout/`
- [ ] Implementar template con Header, router-outlet y Footer
- [ ] Implementar estilos SCSS (flex container, min-height 100vh)
- [ ] Tests unitarios
- [ ] Exportar en barrel `index.ts`
- [ ] Crear barrel general `layout/index.ts`

### Tarea 7: Integrar layout en la aplicacion
**Estimacion**: 0.5 horas

- [ ] Modificar `app.ts` para usar `MainLayoutComponent`
- [ ] Verificar que BookListPage se renderiza correctamente dentro del layout
- [ ] Verificar navegacion y rutas

### Tarea 8: Tests E2E
**Estimacion**: 1 hora

- [ ] Test: Verificar que header se muestra con logo y titulo
- [ ] Test: Verificar que footer se muestra con copyright y enlace
- [ ] Test: Toggle de tema cambia entre dark y light
- [ ] Test: Preferencia de tema persiste despues de recargar pagina
- [ ] Test: Verificar responsive (header/footer en mobile)

### Tarea 9: Revision y refactorizacion
**Estimacion**: 0.5 horas

- [ ] Code review del codigo implementado
- [ ] Verificar cobertura de tests (minimo 80%)
- [ ] Ejecutar ESLint y corregir errores/warnings
- [ ] Verificar accesibilidad (aria-labels, contraste de colores)
- [ ] Verificar que todos los tests pasan

### Tarea 10: Actualizar documentacion y Storybook
**Estimacion**: 1 hora

- [ ] Crear story de Storybook para `ThemeToggleComponent`
- [ ] Crear story de Storybook para `HeaderComponent`
- [ ] Crear story de Storybook para `FooterComponent`
- [ ] Crear story de Storybook para `MainLayoutComponent`
- [ ] Crear documentacion Markdown en `docs/web/story_books/layout-components.md`
- [ ] Verificar que todas las stories se visualizan correctamente en Storybook
- [ ] Documentar variantes (dark/light mode) en las stories

---

## Estimacion Total

| Fase | Horas |
|------|-------|
| ThemeService | 1 |
| CSS Variables | 0.5 |
| ThemeToggle | 1 |
| Header | 1 |
| Footer | 0.5 |
| MainLayout | 1 |
| Integracion | 0.5 |
| Tests E2E | 1 |
| Revision | 0.5 |
| Documentacion y Storybook | 1 |
| **Total** | **8 horas** |

---

## Dependencias

- HU-015: Pantalla de Listado de Libros (completada) - El layout envolvera esta pagina existente
- HU-014: Configuracion inicial del Web Client (completada) - Angular Material ya configurado

---

## Notas de Implementacion

### Accesibilidad

- El toggle de tema debe tener `aria-label` descriptivo que cambie segun el estado actual
- El enlace de GitHub debe tener `rel="noopener noreferrer"` por seguridad
- Los colores deben mantener ratio de contraste WCAG AA

### Performance

- `ThemeService` debe ser singleton (providedIn: 'root')
- Usar OnPush change detection en todos los componentes
- Las transiciones CSS deben ser suaves pero no excesivas (250ms)

### Compatibilidad

- Verificar que `prefers-color-scheme` funciona en todos los navegadores objetivo
- localStorage esta disponible en todos los navegadores modernos

### Integracion con Angular Material

El tema de Angular Material ya esta configurado en `_material-theme.scss`. La sincronizacion con CSS variables se hace via el atributo `data-theme`:

```scss
[data-theme="dark"] {
  @include mat.all-component-colors($library-dark-theme);
}
```
