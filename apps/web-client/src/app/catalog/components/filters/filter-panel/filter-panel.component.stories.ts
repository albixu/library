import type { Meta, StoryObj } from '@storybook/angular';
import { FilterPanelComponent, SearchFilters } from './filter-panel.component';
import { SelectOption } from '../searchable-select/searchable-select.component';

const bookTypes: SelectOption[] = [
  { id: 'technical', name: 'Technical' },
  { id: 'business', name: 'Business' },
  { id: 'fiction', name: 'Fiction' },
  { id: 'science', name: 'Science' },
];

const technicalCategories: SelectOption[] = [
  { id: 'programming', name: 'Programming' },
  { id: 'web-development', name: 'Web Development' },
  { id: 'mobile-development', name: 'Mobile Development' },
  { id: 'devops', name: 'DevOps' },
  { id: 'databases', name: 'Databases' },
  { id: 'security', name: 'Security' },
  { id: 'machine-learning', name: 'Machine Learning' },
  { id: 'cloud-computing', name: 'Cloud Computing' },
];

const bookLevels: SelectOption[] = [
  { id: 'Beginner', name: 'Beginner' },
  { id: 'Intermediate', name: 'Intermediate' },
  { id: 'Advanced', name: 'Advanced' },
  { id: 'Beginner to intermediate', name: 'Beginner to intermediate' },
  { id: 'Intermediate to advanced', name: 'Intermediate to advanced' },
];

const meta: Meta<FilterPanelComponent> = {
  title: 'Catalog/Filters/FilterPanel',
  component: FilterPanelComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
A smart filter panel component that integrates all filter inputs for book search.

## Features
- Text filters for ISBN, Title, and Author (with debounce)
- Type single-select dropdown
- Categories and Levels multi-select with chips
- Semantic search textarea
- Clear all filters button
- **Dependency logic:** When Type changes, Categories and Levels are automatically cleared
- Accessible with proper ARIA attributes

## Filter Logic
- All filters are combined with **AND** logic
- Text inputs have 300ms debounce
- Categories and Levels are disabled until a Type is selected

## Usage
\`\`\`html
<app-filter-panel
  [types]="bookTypes"
  [categories]="categories"
  [levels]="levels"
  [typesLoading]="isLoadingTypes"
  [categoriesLoading]="isLoadingCategories"
  [levelsLoading]="isLoadingLevels"
  (filtersChange)="onFiltersChange($event)"
  (typeChange)="onTypeChange($event)"
/>
\`\`\`
        `,
      },
    },
    layout: 'padded',
  },
  argTypes: {
    types: {
      control: 'object',
      description: 'Available book types for the type filter',
    },
    categories: {
      control: 'object',
      description: 'Available categories (filtered by type)',
    },
    levels: {
      control: 'object',
      description: 'Available levels (filtered by type)',
    },
    typesLoading: {
      control: 'boolean',
      description: 'Shows loading state for types dropdown',
    },
    categoriesLoading: {
      control: 'boolean',
      description: 'Shows loading state for categories dropdown',
    },
    levelsLoading: {
      control: 'boolean',
      description: 'Shows loading state for levels dropdown',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables all filter inputs',
    },
    value: {
      control: 'object',
      description: 'External filter values to sync',
    },
    filtersChange: {
      action: 'filtersChange',
      description: 'Emitted when any filter value changes',
    },
    typeChange: {
      action: 'typeChange',
      description: 'Emitted specifically when type changes (for loading dependent data)',
    },
  },
  decorators: [
    (story) => ({
      ...story(),
      styles: [
        `
        :host {
          display: block;
          width: 320px;
          height: 700px;
          border: 1px solid var(--mat-divider-color, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
        }
        `,
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<FilterPanelComponent>;

/**
 * Default filter panel with all options loaded.
 */
export const Default: Story = {
  args: {
    types: bookTypes,
    categories: technicalCategories,
    levels: bookLevels,
    typesLoading: false,
    categoriesLoading: false,
    levelsLoading: false,
    disabled: false,
  },
};

/**
 * Filter panel with a type pre-selected.
 * Categories and Levels are now enabled.
 */
export const WithTypeSelected: Story = {
  args: {
    types: bookTypes,
    categories: technicalCategories,
    levels: bookLevels,
    value: {
      isbn: '',
      title: '',
      author: '',
      type: 'technical',
      categories: [],
      levels: [],
      text: '',
    } as SearchFilters,
  },
};

/**
 * Filter panel with multiple filters applied.
 */
export const WithFiltersApplied: Story = {
  args: {
    types: bookTypes,
    categories: technicalCategories,
    levels: bookLevels,
    value: {
      isbn: '',
      title: 'Clean Code',
      author: 'Robert Martin',
      type: 'technical',
      categories: ['programming', 'devops'],
      levels: ['Intermediate', 'Advanced'],
      text: '',
    } as SearchFilters,
  },
};

/**
 * Filter panel with semantic search active.
 */
export const WithSemanticSearch: Story = {
  args: {
    types: bookTypes,
    categories: technicalCategories,
    levels: bookLevels,
    value: {
      isbn: '',
      title: '',
      author: '',
      type: '',
      categories: [],
      levels: [],
      text: 'Books about design patterns and clean architecture for experienced developers',
    } as SearchFilters,
  },
};

/**
 * Filter panel with types loading.
 */
export const LoadingTypes: Story = {
  args: {
    types: [],
    categories: [],
    levels: [],
    typesLoading: true,
    categoriesLoading: false,
    levelsLoading: false,
  },
};

/**
 * Filter panel with categories and levels loading after type selection.
 */
export const LoadingDependentData: Story = {
  args: {
    types: bookTypes,
    categories: [],
    levels: [],
    typesLoading: false,
    categoriesLoading: true,
    levelsLoading: true,
    value: {
      isbn: '',
      title: '',
      author: '',
      type: 'technical',
      categories: [],
      levels: [],
      text: '',
    } as SearchFilters,
  },
};

/**
 * Disabled filter panel.
 */
export const Disabled: Story = {
  args: {
    types: bookTypes,
    categories: technicalCategories,
    levels: bookLevels,
    disabled: true,
    value: {
      isbn: '978-0-13-468599-1',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      type: 'technical',
      categories: ['programming'],
      levels: ['Intermediate'],
      text: '',
    } as SearchFilters,
  },
};

/**
 * Empty filter panel without any options.
 */
export const EmptyOptions: Story = {
  args: {
    types: [],
    categories: [],
    levels: [],
    typesLoading: false,
    categoriesLoading: false,
    levelsLoading: false,
  },
};
