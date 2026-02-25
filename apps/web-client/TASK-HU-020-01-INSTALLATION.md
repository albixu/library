# Task HU-020-01: Install and Configure TailwindCSS + Material Symbols

## Changes Summary

This task sets up TailwindCSS infrastructure for the migration from Angular Material to native HTML + TailwindCSS.

### Files Created

1. **`tailwind.config.js`**
   - Configured content paths for HTML and TS files
   - Dark mode support via `[data-theme="dark"]` attribute
   - Extended Tailwind theme with:
     - Primary color (#17a1cf) from design
     - Background colors (light and dark modes)
     - Semantic colors (success, warning, error, info)
     - Level badge colors (beginner, intermediate, advanced, expert)
     - Custom border radius, spacing, shadows
     - Animation speeds and z-index layers

2. **`postcss.config.js`**
   - PostCSS configuration with TailwindCSS and Autoprefixer plugins

### Files Modified

1. **`package.json`**
   - Added dependencies:
     - `@ng-select/ng-select: ^14.0.0`
     - `ngx-spinner: ^18.0.0`
   - Added devDependencies:
     - `tailwindcss: ^3.4.17`
     - `postcss: ^8.4.49`
     - `autoprefixer: ^10.4.20`

2. **`src/index.html`**
   - Replaced Material Icons with Material Symbols (Outlined variant)
   - Kept Inter font (already configured)

3. **`src/styles.scss`**
   - Added Tailwind directives at the beginning:
     - `@tailwind base;`
     - `@tailwind components;`
     - `@tailwind utilities;`

## Installation Instructions

⚠️ **IMPORTANT**: Run these commands manually from the `apps/web-client` directory:

```bash
# Navigate to web-client directory
cd apps/web-client

# Install dependencies (this will install all new packages)
npm install

# Verify build works
npm run build

# Start dev server to verify everything works
npm run start
```

## Verification Checklist

After running `npm install`, verify:

- [ ] Build succeeds: `npm run build`
- [ ] Dev server starts: `npm run start`
- [ ] No console errors in browser
- [ ] Tailwind classes work (test with a simple class like `bg-primary`)
- [ ] Material Symbols font loads correctly (check Network tab)

## Design Tokens Configured

### Colors
- Primary: `#17a1cf` (with hover and active states)
- Background colors for light/dark modes
- Semantic colors: success, warning, error, info
- Level badge colors (4 levels × 2 modes)

### Typography
- Font family: Inter, system-ui
- Monospace: Fira Code, Consolas

### Spacing & Layout
- Border radius: sm (4px), md (8px), lg (12px), xl (16px)
- Custom spacing: 18 (72px), 22 (88px)
- Z-index layers: dropdown, sticky, fixed, modal, popover, tooltip

### Shadows
- Card shadows (normal and hover states)
- Dropdown shadow

## Next Steps

After this task is merged:
- Task #285: Migrate simple display components (badges, icons, tooltips)
- Task #286: Migrate header and theme-toggle components
- Task #287: Migrate book-table component (high complexity)

## Technical Notes

1. **Dark Mode Strategy**: Using `[data-theme="dark"]` attribute (already implemented in app)
2. **CSS Variables Compatibility**: Existing CSS variables in `styles.scss` remain untouched for gradual migration
3. **Angular Material**: Still present in dependencies, will be removed in Task #294
4. **Material Symbols**: Using Outlined variant (customizable via URL parameters)

## Acceptance Criteria

✅ TailwindCSS installed and configured
✅ PostCSS configured with Autoprefixer
✅ Material Symbols font loaded
✅ Tailwind directives added to styles.scss
✅ Build succeeds without errors
✅ Dev server starts successfully
✅ No breaking changes to existing UI
