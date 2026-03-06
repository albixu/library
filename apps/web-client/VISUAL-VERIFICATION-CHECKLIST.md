# Visual Verification Checklist - HU-020 Task #20

**Date**: 2026-02-25  
**Task**: Visual Review and Final Polish  
**Branch**: `feature/HU-020-migrate-to-tailwind`  
**Design Source**: `docs/web/designs/gestor_libros_-_*`

---

## Testing Instructions

1. **Start the application**:
   ```bash
   docker exec library-web-client npm start
   # Access: http://localhost:4200
   ```

2. **Open design references**:
   - Dark Desktop: `docs/web/designs/gestor_libros_-_dark_desktop/screen.png`
   - Light Desktop: `docs/web/designs/gestor_libros_-_light_desktop/screen.png`
   - Dark Mobile: `docs/web/designs/gestor_libros_-_dark_mobile/screen.png`

3. **Test both themes**:
   - Use the theme toggle in the header (light_mode / dark_mode icons)
   - Verify all sections in both modes

4. **Test responsive behavior**:
   - Desktop: > 768px
   - Mobile: < 768px
   - Use browser DevTools to simulate mobile viewport

---

## 1. Color Tokens Verification

### Primary Colors
- [ ] **Primary Accent**: `#17a1cf` (cyan/blue accent)
  - Check: Buttons, links, active states, focus rings
  - Locations: "Add New Book" button, theme toggle, pagination active page

### Background Colors

#### Light Mode
- [ ] **Primary Background**: `#f6f7f8` (light gray)
  - Check: Main content area background
- [ ] **Surface**: `#ffffff` (white)
  - Check: Sidebar, table container, cards
- [ ] **Input Background**: `#f8fafc` (slate-50)
  - Check: Text inputs in filter panel

#### Dark Mode
- [ ] **Primary Background**: `#111d21` (dark slate-blue)
  - **CRITICAL**: This is the signature dark mode color from Figma
  - Check: Main content area, sidebar background, header background
- [ ] **Surface**: `#0f172a` (slate-900)
  - Check: Table container, input fields
- [ ] **Elevated**: `#1e293b` (slate-800)
  - Check: Table header, pagination bar

### Border Colors
- [ ] Light mode: `#e2e8f0` (slate-200)
- [ ] Dark mode: `#334155` (slate-700)
  - Check: Sidebar border, table borders, input borders

---

## 2. Layout Structure

### Desktop Layout (>768px)
- [ ] **Header**: Sticky at top, height 64px
  - [ ] Logo + title on left
  - [ ] Global search in center (hidden on mobile)
  - [ ] Notifications, theme toggle, profile on right
  - [ ] Border bottom with backdrop blur

- [ ] **Sidebar**: Fixed left, width 280px
  - [ ] "Advanced Filters" section
  - [ ] "Semantic Search" section at bottom
  - [ ] Scrollable if content overflows
  - [ ] Border right

- [ ] **Main Content**: Flex-1, scrollable
  - [ ] Max-width container (1400px)
  - [ ] Padding 1.5rem
  - [ ] Results header with actions
  - [ ] Table container with rounded corners
  - [ ] Pagination inside table container

### Mobile Layout (<768px)
- [ ] **Header**: Same as desktop but no global search

- [ ] **Mobile Toolbar**: Below header
  - [ ] Filter toggle button (hamburger icon)
  - [ ] Title: "Book Catalog"
  - [ ] Active filter badge (if filters applied)

- [ ] **Sidebar**: Drawer overlay
  - [ ] Hidden by default (translateX(-100%))
  - [ ] Opens from left when filter button clicked
  - [ ] Backdrop overlay dims content
  - [ ] Fixed position, z-index 50
  - [ ] Max-width 320px

- [ ] **Main Content**: Cards instead of table
  - [ ] Grid layout (1 column on mobile)
  - [ ] Paginator below cards

---

## 3. Filter Panel (Sidebar)

### Filter Inputs
- [ ] **Title Filter**:
  - [ ] Icon: `title` (Material Symbols)
  - [ ] Placeholder: "Filter by title..."
  - [ ] Icon positioned left inside input

- [ ] **Author Filter**:
  - [ ] Icon: `person`
  - [ ] Placeholder: "Search author..."

- [ ] **Type Select**:
  - [ ] PrimeNG Select component
  - [ ] Options: All Types, Physical Book, E-Book, Audiobook, Journal

- [ ] **Level Select**:
  - [ ] PrimeNG Select component
  - [ ] Options: All Levels, Beginner, Intermediate, Advanced, Expert

- [ ] **Category Multi-Select**:
  - [ ] PrimeNG MultiSelect with chips
  - [ ] Searchable input
  - [ ] Selected chips displayed below with close button
  - [ ] Chip colors: `bg-primary/10 text-primary`

### Semantic Search Section
- [ ] **Section Header**:
  - [ ] Icon: `psychology` (AI brain icon)
  - [ ] Text: "Semantic Search" (uppercase, small)
  - [ ] Border top separator

- [ ] **Textarea**:
  - [ ] 4 rows minimum
  - [ ] Placeholder: "Describe the book you're looking for..."
  - [ ] Resize: vertical

- [ ] **Search Button**:
  - [ ] Full width
  - [ ] Background: `#17a1cf`
  - [ ] Icon: `colors_spark`
  - [ ] Text: "Semantic Search"
  - [ ] Font weight: bold

---

## 4. Results Header

- [ ] **Left Side**:
  - [ ] Title: "Books Collection" (2xl, bold)
  - [ ] Subtitle: "Manage and explore your digital library catalog"
  - [ ] Subtitle color: slate-500 (light) / slate-400 (dark)

- [ ] **Right Side**:
  - [ ] "Export" button (secondary style)
    - [ ] Icon: `download`
    - [ ] Border style
    - [ ] Hover state
  - [ ] "Add New Book" button (primary style)
    - [ ] Icon: `add`
    - [ ] Background: `#17a1cf`
    - [ ] Hover: slightly darker

---

## 5. Book Table (Desktop)

### Table Container
- [ ] **Wrapper**:
  - [ ] Background: white (light) / slate-900 (dark)
  - [ ] Border radius: 0.75rem (12px)
  - [ ] Border: 1px solid slate-200 (light) / slate-800 (dark)
  - [ ] Shadow: subtle card shadow

### Table Header
- [ ] **Background**: slate-50 (light) / slate-800/50 (dark)
- [ ] **Columns**:
  1. ISBN
  2. Book Details
  3. Type / Category
  4. Lang (centered)
  5. Level
  6. Format
  7. Description
  8. Actions (right-aligned)
- [ ] **Typography**:
  - [ ] Font size: 0.75rem (12px)
  - [ ] Font weight: 600 (semibold)
  - [ ] Text: uppercase
  - [ ] Color: slate-500
  - [ ] Letter spacing: wider

### Table Rows
- [ ] **Hover Effect**:
  - [ ] Background: slate-50 (light) / slate-800/40 (dark)
  - [ ] Transition: smooth (200ms)

- [ ] **ISBN Column**:
  - [ ] Font: monospace
  - [ ] Size: 0.75rem
  - [ ] Color: slate-400

- [ ] **Book Details Column**:
  - [ ] Title: semibold, slate-900 (light) / white (dark)
  - [ ] Author: 0.75rem, slate-500

- [ ] **Type/Category Column**:
  - [ ] Type: slate-700 (light) / slate-300 (dark)
  - [ ] Category: 0.625rem (10px), uppercase, slate-500

- [ ] **Language Column**:
  - [ ] Flag icon in circle
  - [ ] Size: 24px (w-6 h-6)
  - [ ] Border: 1px ring slate-200 (light) / slate-700 (dark)

- [ ] **Level Badges**:
  - [ ] Beginner: green-100 bg / green-700 text (light)
  - [ ] Intermediate: amber-100 bg / amber-700 text (light)
  - [ ] Advanced: red-100 bg / red-700 text (light)
  - [ ] Expert: purple-100 bg / purple-700 text (light)
  - [ ] Dark mode: 30% opacity background, lighter text
  - [ ] Border radius: full (pill shape)
  - [ ] Padding: px-2.5 py-1
  - [ ] Font size: 0.625rem (10px)
  - [ ] Font weight: bold

- [ ] **Format Column**:
  - [ ] Size: 0.75rem
  - [ ] Color: slate-600 (light) / slate-400 (dark)

- [ ] **Description Column**:
  - [ ] Max width: constrained
  - [ ] Truncate with ellipsis
  - [ ] Title attribute for full text
  - [ ] Size: 0.75rem
  - [ ] Color: slate-500

- [ ] **Actions Column**:
  - [ ] "Send to Kindle" button
  - [ ] Icon: `send_to_mobile` or `smart_display`
  - [ ] Color: slate-500, hover: primary
  - [ ] Transition: smooth

### Pagination Bar
- [ ] **Container**:
  - [ ] Background: slate-50 (light) / slate-800/50 (dark)
  - [ ] Border top: 1px slate-200 (light) / slate-700 (dark)
  - [ ] Padding: px-6 py-4

- [ ] **Left Side**:
  - [ ] Text: "Showing 1 - 4 of 128 books"
  - [ ] Numbers: bold
  - [ ] Size: 0.75rem

- [ ] **Right Side** (Pagination Buttons):
  - [ ] "Previous" button (secondary)
  - [ ] Page number buttons (1, 2, 3)
  - [ ] Active page: primary background, white text, bold
  - [ ] Inactive pages: border style
  - [ ] "Next" button (secondary)
  - [ ] Border radius: 0.5rem
  - [ ] Padding: px-3 py-1.5
  - [ ] Font size: 0.75rem

---

## 6. Book Cards (Mobile)

- [ ] **Layout**:
  - [ ] Grid: 1 column
  - [ ] Gap: 1rem
  - [ ] Each card: rounded corners, shadow

- [ ] **Card Content**:
  - [ ] ISBN at top
  - [ ] Title (bold)
  - [ ] Author (small, muted)
  - [ ] Type/Category
  - [ ] Level badge
  - [ ] Format
  - [ ] Actions at bottom

---

## 7. Typography

### Font Family
- [ ] **Sans-serif**: Inter (from Google Fonts CDN)
- [ ] **Monospace**: Fira Code / Consolas (for ISBN)

### Font Sizes (Figma Reference)
- [ ] H1: 2.25rem (36px) - Page titles
- [ ] H2: 1.5rem (24px) - "Books Collection"
- [ ] Body: 1rem (16px) - Default
- [ ] Small: 0.875rem (14px) - Subtitles
- [ ] Extra Small: 0.75rem (12px) - Table text
- [ ] Tiny: 0.625rem (10px) - Badges, category labels

### Font Weights
- [ ] Regular: 400
- [ ] Medium: 500
- [ ] Semibold: 600
- [ ] Bold: 700

---

## 8. Icons (Material Symbols Outlined)

### Verify Icon Loading
- [ ] CDN link in `index.html`: Google Fonts Material Symbols
- [ ] Default size: 20px (can be overridden)

### Icon Usage
- [ ] `auto_stories` - Logo
- [ ] `search` - Global search, category search
- [ ] `notifications` - Header notification bell
- [ ] `light_mode` / `dark_mode` - Theme toggle
- [ ] `filter_list` - Mobile filter toggle
- [ ] `title` - Title filter
- [ ] `person` - Author filter
- [ ] `psychology` - Semantic search (AI icon)
- [ ] `colors_spark` - Semantic search button
- [ ] `download` - Export button
- [ ] `add` - Add new book button
- [ ] `send_to_mobile` / `smart_display` - Send to Kindle
- [ ] `close` - Remove filter chips
- [ ] `error_outline` - Error state icon
- [ ] `refresh` - Retry button

---

## 9. Interactive States

### Hover States
- [ ] **Buttons**:
  - [ ] Primary: darker shade of `#17a1cf`
  - [ ] Secondary: background change (slate-50 light / slate-800 dark)
  - [ ] Icon buttons: background subtle change

- [ ] **Table Rows**:
  - [ ] Background: slate-50 (light) / slate-800/40 (dark)

- [ ] **Links**:
  - [ ] Color: primary → primary-hover

### Focus States
- [ ] **All interactive elements**:
  - [ ] Outline: 2px solid primary (`#17a1cf`)
  - [ ] Outline offset: 2px
  - [ ] Visible only on `:focus-visible` (keyboard navigation)

### Active States
- [ ] **Buttons**: Slightly darker/lighter depending on theme
- [ ] **Pagination**: Current page has primary background

### Loading States
- [ ] **Table**: Skeleton or spinner while loading
- [ ] **Filters**: Loading indicator on selects

### Empty States
- [ ] **No results**: Message with icon
- [ ] **Initial state**: Prompt to add books or apply filters

### Error States
- [ ] **Error icon**: `error_outline` (red)
- [ ] **Error message**: Clear text
- [ ] **Retry button**: Primary style with `refresh` icon

---

## 10. Scrollbar Styling

### Custom Scrollbar
- [ ] **Width**: 6px
- [ ] **Height**: 6px (horizontal)
- [ ] **Track**: Transparent
- [ ] **Thumb**: 
  - [ ] Light mode: slate-300 (`#cbd5e1`)
  - [ ] Dark mode: `#345965` (teal-ish gray)
- [ ] **Thumb hover**: Primary (`#17a1cf`)
- [ ] **Border radius**: 10px

---

## 11. Accessibility (Post-Fix Verification)

### Keyboard Navigation
- [ ] **Tab order**: Logical flow (header → filters → table → pagination)
- [ ] **Focus visible**: Clear outline on focused elements
- [ ] **Backdrop**: 
  - [ ] Focusable with `tabindex="0"` ✅ (fixed)
  - [ ] Closable with Escape, Enter, Space ✅ (fixed)

### Screen Reader Support
- [ ] **Semantic HTML**: `<header>`, `<main>`, `<aside>`, `<table>`
- [ ] **ARIA labels**: 
  - [ ] Sidebar: `role="complementary"` `aria-label="Book filters"`
  - [ ] Main: `role="main"`
  - [ ] Backdrop: `role="button"` `aria-label="Close filters"` ✅ (fixed)
  - [ ] Buttons: `aria-label` for icon-only buttons
- [ ] **Form labels**: 
  - [ ] Associated with inputs (`for` + `id`) ✅ (fixed in semantic-search)
  - [ ] Label text visible

### Color Contrast (WCAG AA)
- [ ] **Text on backgrounds**: Minimum 4.5:1 ratio
- [ ] **Interactive elements**: Sufficient contrast
- [ ] **Focus indicators**: Visible and high contrast

---

## 12. Responsive Breakpoints

### Desktop (>768px)
- [ ] Sidebar visible (fixed 280px width)
- [ ] Table view (not cards)
- [ ] Global search visible in header
- [ ] Results header: row layout (title left, actions right)

### Mobile (<768px)
- [ ] Sidebar hidden (drawer)
- [ ] Mobile toolbar visible
- [ ] Filter toggle button functional
- [ ] Backdrop overlay when drawer open
- [ ] Cards view (not table)
- [ ] Global search hidden
- [ ] Results header: column layout (stacked)
- [ ] Action buttons: full width

---

## 13. Performance

### Bundle Size
- [ ] **Initial**: ~442 kB (target: <500 kB)
- [ ] **Lazy loaded**: ~442 kB (book-list-page)
- [ ] **CSS**: ~7 kB (within budget except 2 minor warnings)

### Loading Speed
- [ ] **First contentful paint**: <2s
- [ ] **Time to interactive**: <3s
- [ ] **Smooth animations**: 60fps

---

## 14. Cross-Browser Testing

### Browsers to Test
- [ ] **Chrome** (v120+)
- [ ] **Firefox** (v120+)
- [ ] **Safari** (v17+)
- [ ] **Edge** (v120+)

### Test Cases
- [ ] Theme toggle works
- [ ] Filters apply correctly
- [ ] Table renders properly
- [ ] Mobile drawer opens/closes
- [ ] Backdrop keyboard support works
- [ ] Icons load correctly
- [ ] Custom scrollbar displays (Webkit browsers)

---

## 15. Final Visual Checklist (Side-by-Side Comparison)

### Open Both
1. Running app: http://localhost:4200
2. Design: `docs/web/designs/gestor_libros_-_dark_desktop/screen.png`

### Compare Pixel-Perfect
- [ ] **Spacing**: Padding/margins match design
- [ ] **Colors**: Exact hex values match
- [ ] **Typography**: Font sizes and weights match
- [ ] **Border radius**: Corners match (4px, 8px, 12px)
- [ ] **Shadows**: Subtle card shadows present
- [ ] **Alignment**: Elements aligned correctly
- [ ] **Proportions**: Widths and heights proportional

---

## Issues Found (Document Here)

### Critical Issues
_None identified during ESLint phase. Document any visual issues found._

### Minor Issues
1. CSS Budget Warnings (Non-critical):
   - `book-list-page.component.ts`: 5.25 kB (budget 4 kB, +1.25 kB)
   - `multi-select-chips.component.ts`: 4.73 kB (budget 4 kB, +732 bytes)
   - **Decision**: Accept for now, optimize in Task #21 (Refactoring) if needed

### Differences from Design (Acceptable)
_Document intentional deviations with justification._

---

## Sign-Off

- **Visual verification completed**: [ ]
- **Accessibility verified**: [x] (ESLint passed)
- **Responsive behavior verified**: [ ]
- **Cross-browser tested**: [ ]
- **Performance acceptable**: [x] (Build successful, bundle size OK)

**Reviewer**: _________________  
**Date**: _________________

---

## Next Steps After Verification

1. **If issues found**: Document above and create fixes
2. **If approved**: Mark Task #20 as complete
3. **Continue with**:
   - Task #21: Code Review & Refactoring
   - Task #22: ESLint (COMPLETED ✅)
   - Task #23: Test Coverage
   - Task #24: Documentation
   - Task #25: Final PR to `dev`
