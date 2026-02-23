import type { Meta, StoryObj } from '@storybook/angular';
import { MultiSelectChipsComponent, SelectOption } from './multi-select-chips.component.js';

const categories: SelectOption[] = [
  { id: '1', name: 'Programming' },
  { id: '2', name: 'Web Development' },
  { id: '3', name: 'Database' },
  { id: '4', name: 'DevOps' },
  { id: '5', name: 'Cloud Computing' },
  { id: '6', name: 'Machine Learning' },
];

const levels: SelectOption[] = [
  { id: '1', name: 'Beginner' },
  { id: '2', name: 'Intermediate' },
  { id: '3', name: 'Advanced' },
  { id: '4', name: 'Beginner to Intermediate' },
  { id: '5', name: 'Intermediate to Advanced' },
];

const meta: Meta<MultiSelectChipsComponent> = {
  title: 'Catalog/Filters/MultiSelectChips',
  component: MultiSelectChipsComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
A multi-select dropdown component that displays selected items as removable chips.

## Features
- Multiple selection capability
- Displays selected items as chips with remove buttons
- Searchable options with text filter
- Clear all functionality
- Loading state indicator
- Accessible with proper ARIA labels
- Supports disabled state

## Usage
\`\`\`html
<app-multi-select-chips
  label="Categories"
  placeholder="Select categories..."
  [options]="categories"
  [value]="selectedCategories"
  (valueChange)="onCategoriesChange($event)"
/>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text displayed above the select',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no values are selected',
    },
    searchPlaceholder: {
      control: 'text',
      description: 'Placeholder for the search input inside the dropdown',
    },
    options: {
      control: 'object',
      description: 'Array of options to display',
    },
    value: {
      control: 'object',
      description: 'Array of currently selected option ids',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled',
    },
    loading: {
      control: 'boolean',
      description: 'Whether to show loading indicator',
    },
    valueChange: {
      action: 'valueChange',
      description: 'Emitted when selection changes',
    },
  },
};

export default meta;
type Story = StoryObj<MultiSelectChipsComponent>;

/**
 * Default multi-select with standard settings.
 */
export const Default: Story = {
  args: {
    label: 'Categories',
    placeholder: 'Select categories...',
    searchPlaceholder: 'Search categories...',
    options: categories,
    value: [],
    disabled: false,
    loading: false,
  },
};

/**
 * Multi-select with pre-selected values showing chips.
 */
export const WithSelectedValues: Story = {
  args: {
    label: 'Categories',
    placeholder: 'Select categories...',
    options: categories,
    value: ['1', '2', '3'],
  },
};

/**
 * Multi-select for book levels with some selections.
 */
export const LevelsFilter: Story = {
  args: {
    label: 'Levels',
    placeholder: 'Select levels...',
    searchPlaceholder: 'Search levels...',
    options: levels,
    value: ['2', '3'],
  },
};

/**
 * Multi-select in loading state.
 */
export const Loading: Story = {
  args: {
    label: 'Categories',
    placeholder: 'Loading categories...',
    options: [],
    value: [],
    loading: true,
  },
};

/**
 * Disabled multi-select with values.
 */
export const Disabled: Story = {
  args: {
    label: 'Categories',
    placeholder: 'Select categories...',
    options: categories,
    value: ['1', '2'],
    disabled: true,
  },
};

/**
 * Multi-select with many selected items.
 */
export const ManySelections: Story = {
  args: {
    label: 'Categories',
    placeholder: 'Select categories...',
    options: categories,
    value: ['1', '2', '3', '4', '5'],
  },
};

/**
 * Multi-select with many options to demonstrate scrolling.
 */
export const ManyOptions: Story = {
  args: {
    label: 'Categories',
    placeholder: 'Select categories...',
    searchPlaceholder: 'Search categories...',
    options: [
      { id: '1', name: 'Programming' },
      { id: '2', name: 'Web Development' },
      { id: '3', name: 'Mobile Development' },
      { id: '4', name: 'DevOps' },
      { id: '5', name: 'Cloud Computing' },
      { id: '6', name: 'Data Science' },
      { id: '7', name: 'Machine Learning' },
      { id: '8', name: 'Artificial Intelligence' },
      { id: '9', name: 'Databases' },
      { id: '10', name: 'Security' },
      { id: '11', name: 'Networking' },
      { id: '12', name: 'Operating Systems' },
      { id: '13', name: 'Software Architecture' },
      { id: '14', name: 'Design Patterns' },
      { id: '15', name: 'Testing' },
    ],
    value: [],
  },
};
