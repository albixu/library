import type { Meta, StoryObj } from '@storybook/angular';
import { SemanticSearchComponent } from './semantic-search.component';

const meta: Meta<SemanticSearchComponent> = {
  title: 'Catalog/Filters/SemanticSearch',
  component: SemanticSearchComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
A textarea component for semantic/natural language search queries.

## Features
- Multi-line textarea for natural language queries
- Configurable label, placeholder, and hint text
- Debounced value emission (default 300ms)
- Optional character count with maxLength
- Clear button when input has value
- Accessible with proper ARIA labels
- Supports disabled state

## Usage
\`\`\`html
<app-semantic-search
  label="Semantic Search"
  placeholder="Describe what you are looking for..."
  hint="Use natural language to describe the books you want to find"
  [debounceMs]="300"
  (valueChange)="onSearchChange($event)"
/>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text displayed above the textarea',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the textarea',
    },
    hint: {
      control: 'text',
      description: 'Hint text displayed below the textarea',
    },
    value: {
      control: 'text',
      description: 'Initial value of the textarea',
    },
    debounceMs: {
      control: { type: 'number', min: 0, max: 2000, step: 100 },
      description: 'Debounce time in milliseconds',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the textarea is disabled',
    },
    rows: {
      control: { type: 'number', min: 1, max: 10, step: 1 },
      description: 'Number of visible rows',
    },
    maxLength: {
      control: { type: 'number', min: 0, max: 2000, step: 50 },
      description: 'Maximum character length (0 = no limit)',
    },
    valueChange: {
      action: 'valueChange',
      description: 'Emitted when the value changes (after debounce)',
    },
  },
};

export default meta;
type Story = StoryObj<SemanticSearchComponent>;

/**
 * Default semantic search with standard settings.
 */
export const Default: Story = {
  args: {
    label: 'Semantic Search',
    placeholder: 'Describe what you are looking for...',
    hint: '',
    debounceMs: 300,
    disabled: false,
    rows: 3,
    maxLength: 0,
  },
};

/**
 * Semantic search with hint text.
 */
export const WithHint: Story = {
  args: {
    label: 'Semantic Search',
    placeholder: 'Describe what you are looking for...',
    hint: 'Use natural language to describe the books you want to find',
    rows: 3,
  },
};

/**
 * Semantic search with character limit.
 */
export const WithCharacterLimit: Story = {
  args: {
    label: 'Semantic Search',
    placeholder: 'Describe what you are looking for...',
    hint: 'Keep your query concise for better results',
    maxLength: 500,
    rows: 3,
  },
};

/**
 * Semantic search with initial value.
 */
export const WithInitialValue: Story = {
  args: {
    label: 'Semantic Search',
    placeholder: 'Describe what you are looking for...',
    value: 'I want to find books about clean code and software architecture principles',
    rows: 3,
  },
};

/**
 * Semantic search with more rows.
 */
export const LargerTextarea: Story = {
  args: {
    label: 'Semantic Search',
    placeholder: 'Write a detailed description of what you are looking for...',
    hint: 'More detail helps provide better results',
    rows: 6,
    maxLength: 1000,
  },
};

/**
 * Disabled semantic search.
 */
export const Disabled: Story = {
  args: {
    label: 'Semantic Search',
    placeholder: 'Search disabled...',
    value: 'This search is disabled',
    disabled: true,
    rows: 3,
  },
};

/**
 * Custom placeholder for book search.
 */
export const BookSearch: Story = {
  args: {
    label: 'What are you looking for?',
    placeholder: 'e.g., "Books about machine learning for beginners with Python examples"',
    hint: 'Describe the topic, level, or specific features you need',
    rows: 4,
  },
};
