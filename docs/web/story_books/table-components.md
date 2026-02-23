# Table Components

This document describes the table and pagination components for displaying books in the Library catalog.

## Overview

These components provide a complete data grid experience with table display for desktop, cards for mobile, pagination, loading states, and empty state handling.

## Components

### EmptyStateComponent

Displays contextual empty state messages with icon, title, description, and optional action button.

**Location:** `src/app/catalog/components/table/empty-state/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `EmptyStateType` | `'empty'` | Predefined state type |
| `title` | `string \| undefined` | `undefined` | Custom title (overrides type default) |
| `description` | `string \| undefined` | `undefined` | Custom description |
| `icon` | `string \| undefined` | `undefined` | Custom Material icon name |
| `actionLabel` | `string \| undefined` | `undefined` | Action button label |

**EmptyStateType:**
```typescript
type EmptyStateType = 'empty' | 'no-results' | 'initial' | 'error';
```

**Predefined States:**
| Type | Icon | Title | Description |
|------|------|-------|-------------|
| empty | inbox | No books yet | Start by adding your first book... |
| no-results | search_off | No results found | Try adjusting your filters... |
| initial | auto_stories | Search your library | Use the filters above... |
| error | error_outline | Something went wrong | An error occurred... |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `action` | `EventEmitter<void>` | Emitted when action button is clicked |

**Usage:**
```html
<app-empty-state type="empty" />
<app-empty-state type="no-results" />
<app-empty-state type="error" actionLabel="Retry" (action)="onRetry()" />
<app-empty-state
  [icon]="'custom_icon'"
  [title]="'Custom Title'"
  [description]="'Custom description'" />
```

---

### LoadingOverlayComponent

Semi-transparent overlay with Material spinner for loading states.

**Location:** `src/app/catalog/components/table/loading-overlay/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `visible` | `boolean` | `false` | Controls overlay visibility |
| `message` | `string \| undefined` | `undefined` | Loading message below spinner |
| `diameter` | `number` | `48` | Spinner diameter in pixels |
| `transparent` | `boolean` | `false` | Use transparent background |

**Usage:**
```html
<div style="position: relative;">
  <app-loading-overlay [visible]="isLoading" />
  <!-- Content here -->
</div>

<app-loading-overlay [visible]="true" message="Loading books..." />
<app-loading-overlay [visible]="true" [diameter]="64" />
<app-loading-overlay [visible]="true" [transparent]="true" />
```

**Important:** The parent container must have `position: relative` for the overlay to position correctly.

---

### PaginatorComponent

Pagination component with page size selector and navigation controls.

**Location:** `src/app/catalog/components/table/paginator/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `pageIndex` | `number` | `0` | Current page index (0-based) |
| `pageSize` | `number` | `25` | Number of items per page |
| `totalItems` | `number` | `0` | Total number of items |
| `pageSizeOptions` | `number[]` | `[25, 50, 100]` | Available page size options |
| `disabled` | `boolean` | `false` | Disables all controls |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `page` | `EventEmitter<PageEvent>` | Emitted on page change |

**PageEvent Interface:**
```typescript
interface PageEvent {
  pageIndex: number;       // New page index
  previousPageIndex: number; // Previous page index
  pageSize: number;        // Current page size
  length: number;          // Total items
}
```

**Features:**
- Page size selector with customizable options
- First, previous, next, last page navigation
- Range label showing current items (e.g., "1 – 25 of 100")
- Disabled state support
- Full keyboard accessibility

**Usage:**
```html
<app-paginator
  [pageIndex]="currentPage"
  [pageSize]="itemsPerPage"
  [totalItems]="totalBooks"
  (page)="onPageChange($event)" />
```

---

### BookCardComponent

Mobile-optimized card component for displaying book information.

**Location:** `src/app/catalog/components/table/book-card/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `book` | `Book` | *required* | Book data to display |
| `selected` | `boolean` | `false` | Whether the card is selected |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `select` | `EventEmitter<Book>` | Emitted when card is clicked |
| `sendToKindle` | `EventEmitter<Book>` | Emitted when Kindle button is clicked |

**Book Interface:**
```typescript
interface Book {
  id: string;
  isbn: string | null;
  title: string;
  authors: Author[];           // Array of {id, name}
  type: string;
  categories: Category[];      // Array of {id, name}
  level: BookLevelName | null; // 'Beginner' | 'Intermediate' | 'Advanced' | compound levels
  format: BookFormat;          // 'pdf' | 'epub' | 'mobi' | etc. (lowercase)
  originalDescription: string;
  description: string;
  language: string;            // 'en' | 'es' | 'fr' | etc.
  available: boolean;
  similarityScore: number | null;
}
```

**Features:**
- Displays book metadata: title, authors, description
- Integrates data-display components: format icon, language flag, level badge, category chips
- Send to Kindle action button
- Selected state with visual feedback
- Ripple effect on interaction
- Full keyboard accessibility

**Usage:**
```html
<app-book-card
  [book]="book"
  (select)="onBookSelect($event)"
  (sendToKindle)="onSendToKindle($event)" />

<app-book-card
  [book]="book"
  [selected]="true" />
```

---

### BookTableComponent

Desktop-optimized table component for displaying books in a data grid.

**Location:** `src/app/catalog/components/table/book-table/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `books` | `Book[]` | `[]` | Array of books to display |
| `loading` | `boolean` | `false` | Shows loading overlay |
| `emptyStateType` | `'empty' \| 'no-results' \| 'initial'` | `'empty'` | Type of empty state |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `rowClick` | `EventEmitter<Book>` | Emitted when a row is clicked |
| `sendToKindle` | `EventEmitter<Book>` | Emitted when Kindle button is clicked |

**Columns:**
| Column | Description |
|--------|-------------|
| Title | Book title with truncated description |
| Authors | Comma-separated author names |
| Categories | Category chips (max 2 visible) |
| Level | Level badge (Beginner/Intermediate/Advanced/compound levels) |
| Format | Format icon (pdf/epub/mobi/azw3/etc.) |
| Language | Language flag emoji |
| Actions | Send to Kindle button |

**Features:**
- Material Design table
- Loading overlay integration
- Empty state handling (empty, no-results, initial)
- Send to Kindle action per row
- Row click selection
- Hover effects on rows
- Full keyboard accessibility

**Usage:**
```html
<app-book-table
  [books]="books"
  [loading]="isLoading"
  [emptyStateType]="'no-results'"
  (rowClick)="onBookClick($event)"
  (sendToKindle)="onSendToKindle($event)" />
```

---

## Accessibility

All table components follow accessibility best practices:

- **ARIA:** Proper `aria-label`, `aria-busy`, `role` attributes
- **Keyboard:** Full keyboard navigation support
- **Focus:** Visible focus indicators on interactive elements
- **Screen readers:** Content accessible to assistive technology

## Styling

Components use:

- Angular Material theming tokens (`--mat-sys-*`)
- CSS custom properties for theme support
- Automatic light/dark mode adaptation

## Testing

Each component has comprehensive unit tests covering:

- Component creation
- Input binding and rendering
- Event emissions
- Conditional display
- Accessibility attributes
- Edge cases

Run tests with:
```bash
npm test
```

## Storybook

View interactive documentation and examples:
```bash
npm run storybook
```

Navigate to "Catalog > Table" in the Storybook sidebar.
