import type { Meta, StoryObj } from '@storybook/angular';
import { SearchableSelectComponent, SelectOption } from './searchable-select.component';

const bookTypes: SelectOption[] = [
  { id: '1', name: 'Technical' },
  { id: '2', name: 'Business' },
  { id: '3', name: 'Fiction' },
  { id: '4', name: 'Science' },
  { id: '5', name: 'Self-Help' },
  { id: '6', name: 'Biography' },
];

const meta: Meta<SearchableSelectComponent> = {
  title: 'Catalog/Filters/SearchableSelect',
  component: SearchableSelectComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
A single-select dropdown component with built-in search/filter capability.

## Features
- Searchable options with text filter
- Optional "All" option to clear selection
- Loading state indicator
- Accessible with proper ARIA labels
- Supports disabled state

## Usage
\`\`\`html
<app-searchable-select
  label="Book Type"
  placeholder="Select a type..."
  [options]="bookTypes"
  [showAllOption]="true"
  (valueChange)="onTypeChange($event)"
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
      description: 'Placeholder text when no value is selected',
    },
    options: {
      control: 'object',
      description: 'Array of options to display',
    },
    value: {
      control: 'text',
      description: 'Currently selected value (option id)',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled',
    },
    loading: {
      control: 'boolean',
      description: 'Whether to show loading indicator',
    },
    showAllOption: {
      control: 'boolean',
      description: 'Whether to show an "All" option that clears selection',
    },
    valueChange: {
      action: 'valueChange',
      description: 'Emitted when selection changes',
    },
  },
};

export default meta;
type Story = StoryObj<SearchableSelectComponent>;

/**
 * Default searchable select with standard settings.
 */
export const Default: Story = {
  args: {
    label: 'Book Type',
    placeholder: 'Select a type...',
    options: bookTypes,
    showAllOption: true,
    disabled: false,
    loading: false,
  },
};

/**
 * Select with a pre-selected value.
 */
export const WithSelectedValue: Story = {
  args: {
    label: 'Book Type',
    placeholder: 'Select a type...',
    options: bookTypes,
    value: '1',
    showAllOption: true,
  },
};

/**
 * Select without the "All" option.
 */
export const WithoutAllOption: Story = {
  args: {
    label: 'Book Type',
    placeholder: 'Select a type...',
    options: bookTypes,
    showAllOption: false,
  },
};

/**
 * Select in loading state.
 */
export const Loading: Story = {
  args: {
    label: 'Book Type',
    placeholder: 'Loading types...',
    options: [],
    loading: true,
  },
};

/**
 * Disabled select state.
 */
export const Disabled: Story = {
  args: {
    label: 'Book Type',
    placeholder: 'Select a type...',
    options: bookTypes,
    value: '2',
    disabled: true,
  },
};

/**
 * Select with many options to demonstrate scrolling.
 */
export const ManyOptions: Story = {
  args: {
    label: 'Category',
    placeholder: 'Select a category...',
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
    showAllOption: true,
  },
};
