import type { Meta, StoryObj } from '@storybook/angular';
import { TextFilterInputComponent } from './text-filter-input.component';

const meta: Meta<TextFilterInputComponent> = {
  title: 'Catalog/Filters/TextFilterInput',
  component: TextFilterInputComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
A reusable text input component for filtering with configurable debounce.

## Features
- Configurable label, icon, and placeholder
- Debounced value emission (default 300ms)
- Clear button when input has value
- Accessible with proper ARIA labels
- Supports disabled state

## Usage
\`\`\`html
<app-text-filter-input
  label="Search by Title"
  icon="search"
  placeholder="Enter book title..."
  [debounceMs]="300"
  (valueChange)="onTitleChange($event)"
/>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text displayed above the input',
    },
    icon: {
      control: 'text',
      description: 'Material icon name displayed as prefix',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the input',
    },
    value: {
      control: 'text',
      description: 'Initial value of the input',
    },
    debounceMs: {
      control: { type: 'number', min: 0, max: 2000, step: 100 },
      description: 'Debounce time in milliseconds',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    valueChange: {
      action: 'valueChange',
      description: 'Emitted when the value changes (after debounce)',
    },
  },
};

export default meta;
type Story = StoryObj<TextFilterInputComponent>;

/**
 * Default text filter input with standard settings.
 */
export const Default: Story = {
  args: {
    label: 'Filter',
    icon: 'filter_list',
    placeholder: 'Enter text...',
    debounceMs: 300,
    disabled: false,
  },
};

/**
 * Search input for ISBN filtering.
 */
export const IsbnFilter: Story = {
  args: {
    label: 'ISBN',
    icon: 'tag',
    placeholder: 'Enter ISBN...',
    debounceMs: 300,
  },
};

/**
 * Search input for title filtering.
 */
export const TitleFilter: Story = {
  args: {
    label: 'Title',
    icon: 'book',
    placeholder: 'Search by title...',
    debounceMs: 300,
  },
};

/**
 * Search input for author filtering.
 */
export const AuthorFilter: Story = {
  args: {
    label: 'Author',
    icon: 'person',
    placeholder: 'Search by author...',
    debounceMs: 300,
  },
};

/**
 * Input with an initial value showing the clear button.
 */
export const WithInitialValue: Story = {
  args: {
    label: 'Title',
    icon: 'book',
    placeholder: 'Search by title...',
    value: 'Clean Code',
    debounceMs: 300,
  },
};

/**
 * Disabled input state.
 */
export const Disabled: Story = {
  args: {
    label: 'Title',
    icon: 'book',
    placeholder: 'Search by title...',
    value: 'Cannot edit',
    disabled: true,
  },
};

/**
 * Input with custom debounce time (500ms).
 */
export const CustomDebounce: Story = {
  args: {
    label: 'Search',
    icon: 'search',
    placeholder: 'Type slowly...',
    debounceMs: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'This input has a 500ms debounce instead of the default 300ms.',
      },
    },
  },
};
