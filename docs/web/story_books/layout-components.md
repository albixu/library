# Layout Components

This document describes the layout components that provide the main structure for the Library application.

## Overview

The layout components create a consistent visual structure across all pages of the application. They include the header with navigation and theme toggle, a main content area, and a footer with links.

## Components

### HeaderComponent

Application header with logo, title, and theme toggle.

**Location:** `src/app/layout/header/`

**Features:**
| Feature | Description |
|---------|-------------|
| Logo | Material icon `auto_stories` in cyan container |
| Title | "Library" with bold styling |
| Theme Toggle | Button to switch between light/dark themes |
| Position | Sticky at top of viewport |

**Design Specifications:**
| Element | Style |
|---------|-------|
| Logo container | 40x40px, border-radius: 8px, background: accent color |
| Logo icon | auto_stories, 24px, white |
| Title | 1.25rem, font-weight: 700, letter-spacing: -0.025em |
| Position | sticky, top: 0, z-index: var(--z-sticky) |

**Usage:**
```html
<app-header />
```

**Accessibility:**
- Theme toggle has appropriate aria-label
- Uses semantic `<header>` element

---

### FooterComponent

Application footer with copyright and GitHub link.

**Location:** `src/app/layout/footer/`

**Features:**
| Feature | Description |
|---------|-------------|
| Copyright | "© 2025 Library" |
| Separator | Bullet point (•) |
| GitHub Link | Links to repository |

**Content:**
| Element | Value |
|---------|-------|
| Copyright text | © 2025 Library |
| Link | GitHub → https://github.com/albixu/library |
| Link attributes | target="_blank", rel="noopener noreferrer" |

**Usage:**
```html
<app-footer />
```

**Accessibility:**
- External link opens in new tab with security attributes
- Focus visible styles for keyboard navigation
- Uses semantic `<footer>` element

---

### MainLayoutComponent

Main application layout wrapper that structures the page.

**Location:** `src/app/layout/main-layout/`

**Features:**
| Feature | Description |
|---------|-------------|
| Header | App header at the top |
| Content Area | Router outlet for page content |
| Footer | App footer at the bottom |
| Layout | Flexbox with min-height: 100vh |

**Structure:**
```
┌────────────────────────────────┐
│          app-header            │
├────────────────────────────────┤
│                                │
│         <router-outlet>        │
│           (content)            │
│                                │
├────────────────────────────────┤
│          app-footer            │
└────────────────────────────────┘
```

**Styling:**
| Property | Value |
|----------|-------|
| Display | flex, column direction |
| Min height | 100vh |
| Content area | flex: 1 (grows to fill space) |

**Usage:**
Used as the root layout in routing configuration:
```typescript
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'books', pathMatch: 'full' },
      { path: 'books', loadChildren: () => import('./catalog/catalog.routes') },
    ],
  },
];
```

---

### ThemeToggleComponent

Button to toggle between light and dark themes.

**Location:** `src/app/shared/components/theme-toggle/`

**Features:**
| Feature | Description |
|---------|-------------|
| Icon | Shows sun (light_mode) in dark mode, moon (dark_mode) in light mode |
| Tooltip | Displays current action (e.g., "Switch to light mode") |
| Persistence | Saves preference to localStorage |
| System Detection | Respects prefers-color-scheme on first load |

**Usage:**
```html
<app-theme-toggle />
```

**Theme Service API:**
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

**Theme Detection Priority:**
1. localStorage preference (`library-theme` key)
2. System preference (`prefers-color-scheme: light`)
3. Default: dark mode

**Accessibility:**
- Button has dynamic aria-label
- Keyboard navigable with focus indicators
- Tooltip provides context

---

## Theme System

The application supports light and dark themes using CSS custom properties.

### CSS Variables

Light mode (`:root`):
```css
--color-bg-primary: #f8fafc;
--color-bg-surface: #ffffff;
--color-text-primary: #0f172a;
--color-text-secondary: #64748b;
--color-accent: #17a1cf;
--color-border: #e2e8f0;
```

Dark mode (`[data-theme="dark"]`):
```css
--color-bg-primary: #0f172a;
--color-bg-surface: #1e293b;
--color-text-primary: #f8fafc;
--color-text-secondary: #94a3b8;
--color-accent: #17a1cf;
--color-border: #334155;
```

### Transition

Theme changes use smooth CSS transitions:
```css
transition: background-color 250ms ease-in-out,
            color 250ms ease-in-out,
            border-color 250ms ease-in-out;
```

---

## Storybook

All layout components have Storybook stories demonstrating their variants:

- **Header:** Default, Dark Theme, Light Theme, Mobile
- **Footer:** Default, Dark Theme, Light Theme, Mobile
- **MainLayout:** Default, With Content, Mobile

View the stories at `Layout/` in Storybook.

---

## Testing

### Unit Tests

Each component has comprehensive unit tests:

| Component | Test File | Tests |
|-----------|-----------|-------|
| HeaderComponent | header.component.spec.ts | 11 tests |
| FooterComponent | footer.component.spec.ts | 11 tests |
| MainLayoutComponent | main-layout.component.spec.ts | 11 tests |
| ThemeToggleComponent | theme-toggle.component.spec.ts | 6 tests |
| ThemeService | theme.service.spec.ts | Multiple tests |

### E2E Tests

End-to-end tests for layout and theme functionality:

| Test Suite | File | Tests |
|------------|------|-------|
| Layout - Header | layout-theme.spec.ts | 5 tests |
| Layout - Footer | layout-theme.spec.ts | 4 tests |
| Theme Toggle | layout-theme.spec.ts | 7 tests |
| Layout - Responsive | layout-theme.spec.ts | 2 tests |

Run E2E tests with: `npm run test:e2e`
