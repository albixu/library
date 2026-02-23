import type { Meta, StoryObj } from '@storybook/angular';
import { EmptyStateComponent, EmptyStateType } from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Catalog/Table/EmptyState',
  component: EmptyStateComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Displays contextual empty state messages with icon, title, description, and optional action button.

## Features
- Predefined states: empty, no-results, initial, error
- Customizable icon, title, and description
- Optional action button with output event
- Fully accessible with ARIA roles

## Usage
\`\`\`html
<app-empty-state type="empty" />
<app-empty-state type="no-results" />
<app-empty-state type="error" actionLabel="Retry" (action)="onRetry()" />
<app-empty-state
  [icon]="'custom_icon'"
  [title]="'Custom Title'"
  [description]="'Custom description'" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    type: {
      description: 'Predefined state type',
      control: { type: 'select' },
      options: ['empty', 'no-results', 'initial', 'error'] as EmptyStateType[],
    },
    icon: {
      description: 'Custom Material icon name (overrides type default)',
      control: { type: 'text' },
    },
    title: {
      description: 'Custom title (overrides type default)',
      control: { type: 'text' },
    },
    description: {
      description: 'Custom description (overrides type default)',
      control: { type: 'text' },
    },
    actionLabel: {
      description: 'Action button label. Button only shown when provided.',
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const Empty: Story = {
  args: {
    type: 'empty',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default empty state for when the library has no books.',
      },
    },
  },
};

export const NoResults: Story = {
  args: {
    type: 'no-results',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shown when search or filters return no matching books.',
      },
    },
  },
};

export const Initial: Story = {
  args: {
    type: 'initial',
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state prompting users to start searching.',
      },
    },
  },
};

export const Error: Story = {
  args: {
    type: 'error',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when loading fails.',
      },
    },
  },
};

export const ErrorWithRetry: Story = {
  args: {
    type: 'error',
    actionLabel: 'Try Again',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state with retry action button.',
      },
    },
  },
};

export const CustomContent: Story = {
  args: {
    icon: 'book',
    title: 'Welcome to Your Library',
    description: 'Add your first book to get started with organizing your collection.',
    actionLabel: 'Add Book',
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully customized empty state with custom icon, text, and action.',
      },
    },
  },
};

export const EmptyWithAction: Story = {
  args: {
    type: 'empty',
    actionLabel: 'Add First Book',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state with action button to add a book.',
      },
    },
  },
};
