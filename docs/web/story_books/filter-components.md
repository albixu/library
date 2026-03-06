# Filter Components

This document describes the reusable filter components for the Library catalog.

## Overview

The filter components are designed to be composable, accessible, and consistent with Material Design. They are used in the `FilterPanelComponent` to build search interfaces.

## Components

### TextFilterInputComponent

A text input with debounce for filtering by text values.

**Location:** `src/app/catalog/components/filters/text-filter-input/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `'Filter'` | Label displayed above the input |
| `icon` | `string` | `'filter_list'` | Material icon name |
| `placeholder` | `string` | `''` | Placeholder text |
| `value` | `string` | `''` | Initial/current value |
| `debounceMs` | `number` | `300` | Debounce time in milliseconds |
| `disabled` | `boolean` | `false` | Disables the input |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `valueChange` | `string` | Emitted after debounce when value changes |

**Usage:**
```html
<app-text-filter-input
  label="Title"
  icon="book"
  placeholder="Search by title..."
  [debounceMs]="300"
  (valueChange)="onTitleChange($event)"
/>
```

---

### SearchableSelectComponent

A single-select dropdown with search/filter capability.

**Location:** `src/app/catalog/components/filters/searchable-select/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `'Select'` | Label displayed above the select |
| `placeholder` | `string` | `''` | Placeholder when nothing selected |
| `searchPlaceholder` | `string` | `'Search...'` | Placeholder for search input |
| `options` | `SelectOption[]` | `[]` | Available options |
| `value` | `string` | `''` | Selected option id |
| `disabled` | `boolean` | `false` | Disables the select |
| `loading` | `boolean` | `false` | Shows loading indicator |
| `showAllOption` | `boolean` | `true` | Shows an "All" option to clear |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `valueChange` | `string` | Emitted when selection changes |

**SelectOption Interface:**
```typescript
interface SelectOption {
  id: string;
  name: string;
}
```

**Usage:**
```html
<app-searchable-select
  label="Book Type"
  placeholder="Select a type..."
  [options]="bookTypes"
  [showAllOption]="true"
  (valueChange)="onTypeChange($event)"
/>
```

---

### MultiSelectChipsComponent

A multi-select dropdown displaying selected items as removable chips.

**Location:** `src/app/catalog/components/filters/multi-select-chips/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `'Select'` | Label displayed above the select |
| `placeholder` | `string` | `''` | Placeholder when nothing selected |
| `searchPlaceholder` | `string` | `'Search...'` | Placeholder for search input |
| `options` | `SelectOption[]` | `[]` | Available options |
| `value` | `string[]` | `[]` | Selected option ids |
| `disabled` | `boolean` | `false` | Disables the select |
| `loading` | `boolean` | `false` | Shows loading indicator |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `valueChange` | `string[]` | Emitted when selection changes |

**Usage:**
```html
<app-multi-select-chips
  label="Categories"
  placeholder="Select categories..."
  [options]="categories"
  [value]="selectedCategories"
  (valueChange)="onCategoriesChange($event)"
/>
```

---

### SemanticSearchComponent

A textarea for semantic/natural language search queries.

**Location:** `src/app/catalog/components/filters/semantic-search/`

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `'Semantic Search'` | Label displayed above textarea |
| `placeholder` | `string` | `'Describe what...'` | Placeholder text |
| `hint` | `string` | `''` | Hint text below textarea |
| `value` | `string` | `''` | Initial/current value |
| `debounceMs` | `number` | `300` | Debounce time in milliseconds |
| `disabled` | `boolean` | `false` | Disables the textarea |
| `rows` | `number` | `3` | Number of visible rows |
| `maxLength` | `number` | `0` | Character limit (0 = unlimited) |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `valueChange` | `string` | Emitted after debounce when value changes |

**Usage:**
```html
<app-semantic-search
  label="What are you looking for?"
  placeholder="Describe the books you want to find..."
  hint="Use natural language for better results"
  [rows]="4"
  [maxLength]="500"
  (valueChange)="onSearchChange($event)"
/>
```

---

### FilterPanelComponent

A smart container component that integrates all filter inputs into a cohesive filter panel.

**Location:** `src/app/catalog/components/filters/filter-panel/`

**Features:**
- Integrates all filter components (text, select, multi-select, semantic search)
- Handles dependency logic: When Type changes, Categories and Levels are cleared
- Provides "Clear all filters" functionality
- Emits consolidated filter changes

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `types` | `SelectOption[]` | `[]` | Available book types |
| `categories` | `SelectOption[]` | `[]` | Available categories (filtered by type) |
| `levels` | `SelectOption[]` | `[]` | Available levels (filtered by type) |
| `typesLoading` | `boolean` | `false` | Shows loading state for types |
| `categoriesLoading` | `boolean` | `false` | Shows loading state for categories |
| `levelsLoading` | `boolean` | `false` | Shows loading state for levels |
| `disabled` | `boolean` | `false` | Disables all inputs |
| `value` | `SearchFilters \| null` | `null` | External filter values to sync |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `filtersChange` | `SearchFilters` | Emitted when any filter value changes |
| `typeChange` | `string` | Emitted when type changes (for loading dependent data) |

**SearchFilters Interface:**
```typescript
interface SearchFilters {
  isbn: string;
  title: string;
  author: string;
  type: string;
  categories: string[];
  levels: string[];
  text: string;
}
```

**Filter Behavior:**
- All text inputs (ISBN, Title, Author, Semantic Search) have built-in 300ms debounce
- Categories and Levels are disabled until a Type is selected
- When Type changes, Categories and Levels selections are automatically cleared
- The `typeChange` output allows parent components to load dependent data
- All filters combine with **AND** logic

**Usage:**
```html
<app-filter-panel
  [types]="bookTypes"
  [categories]="categories"
  [levels]="levels"
  [typesLoading]="isLoadingTypes"
  [categoriesLoading]="isLoadingCategories"
  [levelsLoading]="isLoadingLevels"
  (filtersChange)="onFiltersChange($event)"
  (typeChange)="loadDependentData($event)"
/>
```

**Integration Example:**
```typescript
@Component({
  template: `
    <app-filter-panel
      [types]="types()"
      [categories]="categories()"
      [levels]="levels()"
      [typesLoading]="typesLoading()"
      [categoriesLoading]="categoriesLoading()"
      [levelsLoading]="levelsLoading()"
      (filtersChange)="onFiltersChange($event)"
      (typeChange)="onTypeChange($event)"
    />
  `
})
export class BookListPageComponent {
  types = signal<SelectOption[]>([]);
  categories = signal<SelectOption[]>([]);
  levels = signal<SelectOption[]>([]);

  typesLoading = signal(true);
  categoriesLoading = signal(false);
  levelsLoading = signal(false);

  async ngOnInit() {
    this.types.set(await this.bookService.getTypes());
    this.typesLoading.set(false);
  }

  async onTypeChange(typeId: string) {
    if (!typeId) {
      this.categories.set([]);
      this.levels.set([]);
      return;
    }

    this.categoriesLoading.set(true);
    this.levelsLoading.set(true);

    const [categories, levels] = await Promise.all([
      this.bookService.getCategories(typeId),
      this.bookService.getLevels(typeId),
    ]);

    this.categories.set(categories);
    this.levels.set(levels);
    this.categoriesLoading.set(false);
    this.levelsLoading.set(false);
  }

  onFiltersChange(filters: SearchFilters) {
    this.searchBooks(filters);
  }
}
```

---

## Accessibility

All filter components follow accessibility best practices:

- **Labels:** All inputs have associated labels
- **ARIA:** Proper `aria-label` attributes on interactive elements
- **Keyboard:** Full keyboard navigation support
- **Focus:** Visible focus indicators
- **Screen readers:** Compatible with screen reader software

## Styling

Components use Angular Material theming and CSS custom properties for consistent styling:

- Automatically adapt to light/dark theme
- Use `--mat-*` CSS variables for Material tokens
- Consistent spacing and sizing

## Testing

Each component has comprehensive unit tests covering:

- Component creation
- Input binding
- Output emissions
- Debounce behavior
- Accessibility attributes
- Disabled states
- Loading states (where applicable)

Run tests with:
```bash
npm test
```

## Storybook

View interactive documentation and examples:
```bash
npm run storybook
```

Navigate to "Catalog > Filters" in the Storybook sidebar.
