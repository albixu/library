---
name: BiblioManager Pro
colors:
  surface: '#0f1417'
  surface-dim: '#0f1417'
  surface-bright: '#353a3d'
  surface-container-lowest: '#0a0f12'
  surface-container-low: '#171c1f'
  surface-container: '#1b2023'
  surface-container-high: '#262b2e'
  surface-container-highest: '#303539'
  on-surface: '#dfe3e7'
  on-surface-variant: '#bdc8cf'
  inverse-surface: '#dfe3e7'
  inverse-on-surface: '#2c3134'
  outline: '#879299'
  outline-variant: '#3e484e'
  surface-tint: '#6ed2ff'
  primary: '#6ed2ff'
  on-primary: '#003547'
  primary-container: '#17a1cf'
  on-primary-container: '#003244'
  inverse-primary: '#006686'
  secondary: '#a6cddb'
  on-secondary: '#0b3540'
  secondary-container: '#294e5a'
  on-secondary-container: '#98becc'
  tertiary: '#ffb867'
  on-tertiary: '#482900'
  tertiary-container: '#cf8522'
  on-tertiary-container: '#452700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bfe8ff'
  primary-fixed-dim: '#6ed2ff'
  on-primary-fixed: '#001f2a'
  on-primary-fixed-variant: '#004d65'
  secondary-fixed: '#c2e9f7'
  secondary-fixed-dim: '#a6cddb'
  on-secondary-fixed: '#001f27'
  on-secondary-fixed-variant: '#264c57'
  tertiary-fixed: '#ffddbb'
  tertiary-fixed-dim: '#ffb867'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#0f1417'
  on-background: '#dfe3e7'
  surface-variant: '#303539'
  background-dark: '#111d21'
  surface-slate: '#1e293b'
  status-beginner: '#10b981'
  status-intermediate: '#f59e0b'
  status-advanced: '#ef4444'
  status-expert: '#a855f7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: monospace
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 80rem
  sidebar-width: 20rem
  gutter: 1.5rem
  section-gap: 2rem
  row-padding: 1rem
---

## Brand & Style
BiblioManager Pro is a sophisticated, data-centric library management interface designed for digital-first researchers and collectors. The brand personality is **Corporate Modern** with a focus on systematic organization and high-utility density. It balances a tech-forward feel with the academic weight of a physical library. 

The aesthetic is characterized by a "Dark Mode First" philosophy that utilizes deep teals and slate tones to reduce eye strain during long-form inventory management. It employs a **Tonal Layering** style where depth is communicated through surface-on-surface container hierarchies rather than aggressive shadows. The interface should feel precise, calm, and highly functional.

## Colors
The palette is rooted in a "Deep Oceanic" spectrum. The primary color is a vibrant Cyan (#17a1cf), used for calls to action, active states, and semantic highlights. The background utilizes a custom deep teal-black (#111d21) which provides more character than a standard neutral gray.

Status-based semantics are critical for categorization:
- **Primary/Action:** Cyan for primary buttons and selection indicators.
- **Surface Tones:** A range of slates (Slate 800/900) for cards and table headers to create structural separation.
- **Accents:** Muted versions of Green, Amber, Red, and Purple are reserved for "Level" indicators, used with a high-transparency background (10-30% opacity) to maintain a cohesive dark-mode aesthetic.

## Typography
The system relies exclusively on **Inter** to project a clean, technical, and utilitarian image. 

- **Hierarchy:** Distinct contrast is achieved through weight rather than family changes. Headlines use SemiBold (600) or Bold (700) to stand out against the dark backgrounds.
- **Data Density:** Body text is set at 14px for primary content, scaling down to 12px for metadata. 
- **Metadata Labels:** Use 10px Bold Uppercase with slight tracking for section headers and category tags to ensure they are legible but occupy minimal vertical space.
- **Monospacing:** ISBNs and technical identifiers use a standard monospace font for easy character differentiation.

## Layout & Spacing
The layout uses a **Fixed Sidebar + Fluid Content** model. 
- **Sidebar:** A fixed 320px (20rem) left-hand column serves as the control center for filtering and semantic search.
- **Main Canvas:** A fluid area with a maximum content width of 1280px (80rem), centered on ultra-wide displays.
- **Grid & Rhythm:** A strict 4px/8px baseline grid is used. Standard padding for containers is 24px (1.5rem). 
- **Table Layout:** Tables prioritize horizontal scanability with 16px horizontal cell padding and 12px vertical padding.
- **Mobile Reflow:** On mobile, the sidebar collapses into a bottom-sheet or hidden drawer, and the table transitions to a stacked card format.

## Elevation & Depth
Depth in BiblioManager is achieved through **Tonal Tiering** and subtle border treatments rather than traditional drop shadows.

- **Level 0 (Background):** #111d21.
- **Level 1 (Sidebar/Header):** Semi-transparent background-dark/80 with a backdrop-blur (12px) to create a "glass" navigation effect that stays pinned.
- **Level 2 (Cards/Table):** Solid Slate-900 with a 1px border (Slate-800) to define edges.
- **Interactive States:** Hovering over rows or buttons uses a subtle lightening of the background color (Slate-800/40) rather than an increase in shadow.
- **Shadows:** Use only "shadow-sm" (soft, low-spread) for floating menus or popovers to maintain the flat, technical aesthetic.

## Shapes
The shape language is **Soft Functional**. 
- **Standard Radius:** 4px (0.25rem) for input fields and small buttons.
- **Container Radius:** 8px (0.5rem) to 12px (0.75rem) for cards and the main table container.
- **Pill Shapes:** Used exclusively for status tags (Levels) and the light/dark mode toggle to differentiate "interactive/status" elements from "structural/input" elements.
- **Icons:** Material Symbols (Outlined) are used with a 20px base size, mirroring the refined, thin-stroke aesthetic of the typography.

## Components
- **Buttons:** Primary buttons are solid Cyan with white text. Secondary buttons are ghost-style with slate borders. Hover states should include a 10% brightness increase.
- **Input Fields:** Darker than the container background (Slate-950 or background-dark) with a 1px Slate-800 border. Focus state uses a 2px Cyan ring.
- **Chips/Tags:** Used for categories. These have a 10% Cyan background and Cyan text, using the 10px Bold Caps typography.
- **Tables:** Headers use a subtle gray-blue background (Slate-800/50) to separate the sticky header from the data rows. Divide lines are 1px Slate-800.
- **Status Badges:** Small, pill-shaped backgrounds with high-contrast text colored according to the "named_colors" logic (e.g., Amber for Intermediate).
- **Search Bars:** Feature a lead icon (Search) and trailing shortcut hints where applicable.