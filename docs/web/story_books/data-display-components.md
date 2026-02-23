# Data Display Components

This document describes the reusable data display components for visualizing book information in the Library catalog.

## Overview

These components are designed to display specific book attributes in a visually consistent and accessible way. They are used in book tables, cards, and detail views.

## Components

### CategoryChipsComponent

Displays a list of category names as styled chips.

**Location:** `src/app/catalog/components/data-display/category-chips/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `categories` | `string[]` | `[]` | Array of category names to display |
| `maxVisible` | `number \| undefined` | `undefined` | Maximum visible chips (shows overflow indicator) |

**Usage:**
```html
<app-category-chips [categories]="['TypeScript', 'Angular', 'Testing']" />
<app-category-chips [categories]="book.categories" [maxVisible]="3" />
```

**Features:**
- Renders each category as a styled chip
- Limits visible categories with `maxVisible`
- Shows "+N" overflow indicator with tooltip for hidden categories
- Accessible with proper ARIA roles

---

### LevelBadgeComponent

Displays a book's difficulty level as a colored badge.

**Location:** `src/app/catalog/components/data-display/level-badge/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `level` | `BookLevelName \| null \| undefined` | `undefined` | Book difficulty level |

**BookLevelName Type:**
```typescript
type BookLevelName = 
  | 'Beginner' 
  | 'Intermediate' 
  | 'Advanced' 
  | 'Beginner to Intermediate' 
  | 'Intermediate to Advanced';
```

**Level Colors:**
| Level | Light Mode | Dark Mode |
|-------|------------|-----------|
| Beginner | Green (bg-green-100, text-green-700) | Green (bg-green-900/30, text-green-400) |
| Intermediate | Amber (bg-amber-100, text-amber-700) | Amber (bg-amber-900/30, text-amber-400) |
| Advanced | Red (bg-red-100, text-red-700) | Red (bg-red-900/30, text-red-400) |
| Beginner to Intermediate | Teal (bg-teal-50, text-teal-700) | Teal (bg-teal-900/30, text-teal-400) |
| Intermediate to Advanced | Orange (bg-orange-100, text-orange-700) | Orange (bg-orange-900/30, text-orange-400) |

**Usage:**
```html
<app-level-badge [level]="'Beginner'" />
<app-level-badge [level]="book.level" />
```

---

### FormatIconComponent

Displays a Material icon representing the book format.

**Location:** `src/app/catalog/components/data-display/format-icon/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | `BookFormat \| undefined` | `undefined` | Book format |
| `size` | `IconSize` | `'small'` | Icon size (small, medium, large) |

**BookFormat Type:**
```typescript
type BookFormat = 'pdf' | 'epub' | 'mobi' | 'azw3' | 'djvu' | 'cbz' | 'cbr' | 'txt' | 'other';
```

**Format Icons:**
| Format | Icon |
|--------|------|
| pdf | picture_as_pdf |
| epub | book |
| mobi | tablet_android |
| azw3 | tablet_android |
| djvu | photo_library |
| cbz | collections |
| cbr | collections |
| txt | description |
| other | insert_drive_file |

**Sizes:**
| Size | Font Size |
|------|-----------|
| small | 1rem |
| medium | 1.25rem |
| large | 1.5rem |

**Usage:**
```html
<app-format-icon [format]="'pdf'" />
<app-format-icon [format]="book.format" [size]="'large'" />
```

---

### LanguageFlagComponent

Displays a flag emoji representing the book's language.

**Location:** `src/app/catalog/components/data-display/language-flag/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `languageCode` | `LanguageCode \| undefined` | `undefined` | ISO 639-1 language code |
| `showName` | `boolean` | `false` | Show language name next to flag |

**LanguageCode Type:**
```typescript
type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt';
```

**Supported Languages:**
| Code | Flag | Name |
|------|------|------|
| en | 🇬🇧 | English |
| es | 🇪🇸 | Spanish |
| fr | 🇫🇷 | French |
| de | 🇩🇪 | German |
| it | 🇮🇹 | Italian |
| pt | 🇵🇹 | Portuguese |
| other | 🌐 | Unknown |

**Usage:**
```html
<app-language-flag [languageCode]="'en'" />
<app-language-flag [languageCode]="book.language" [showName]="true" />
```

---

### TruncatedTextComponent

Displays text with CSS line-clamp truncation and tooltip showing full content.

**Location:** `src/app/catalog/components/data-display/truncated-text/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | `string` | `''` | Text content to display |
| `maxLines` | `number` | `2` | Maximum visible lines before truncation |
| `showTooltip` | `boolean` | `true` | Show full text in tooltip on hover |

**Features:**
- CSS-based multi-line truncation using `-webkit-line-clamp`
- Configurable number of visible lines
- Native tooltip showing full text on hover
- Safe against XSS (text is escaped, not rendered as HTML)

**Usage:**
```html
<app-truncated-text [text]="book.description" />
<app-truncated-text [text]="content" [maxLines]="3" />
<app-truncated-text [text]="title" [maxLines]="1" [showTooltip]="false" />
```

---

## Accessibility

All data display components follow accessibility best practices:

- **ARIA:** Proper `aria-label` attributes
- **Roles:** Appropriate semantic roles (list, listitem, img)
- **Screen readers:** Full content available to assistive technology
- **Tooltips:** Native title attributes for additional context

## Styling

Components use:

- Angular Material theming tokens (`--mat-sys-*`)
- CSS custom properties for theme support
- Automatic light/dark mode adaptation via `prefers-color-scheme` and `.dark` class

## Testing

Each component has comprehensive unit tests covering:

- Component creation
- Input binding and rendering
- Conditional display
- Accessibility attributes
- Edge cases (empty values, unknown values)

Run tests with:
```bash
npm test
```

## Storybook

View interactive documentation and examples:
```bash
npm run storybook
```

Navigate to "Catalog > Data Display" in the Storybook sidebar.
