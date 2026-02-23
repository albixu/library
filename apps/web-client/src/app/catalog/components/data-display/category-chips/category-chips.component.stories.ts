import type { Meta, StoryObj } from '@storybook/angular';
import { CategoryChipsComponent } from './category-chips.component';

const meta: Meta<CategoryChipsComponent> = {
  title: 'Catalog/Data Display/CategoryChips',
  component: CategoryChipsComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Displays a list of category names as chips.

## Features
- Renders each category as a styled chip
- Limits visible categories with \`maxVisible\` input
- Shows overflow indicator with tooltip for hidden categories
- Fully accessible with proper ARIA roles

## Usage
\`\`\`html
<app-category-chips [categories]="['TypeScript', 'Angular', 'Testing']" />
<app-category-chips [categories]="categories" [maxVisible]="3" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    categories: {
      description: 'Array of category names to display',
      control: { type: 'object' },
    },
    maxVisible: {
      description: 'Maximum number of visible chips. Shows overflow indicator for the rest.',
      control: { type: 'number' },
    },
  },
};

export default meta;
type Story = StoryObj<CategoryChipsComponent>;

export const Default: Story = {
  args: {
    categories: ['TypeScript', 'Angular', 'Testing'],
  },
};

export const SingleCategory: Story = {
  args: {
    categories: ['JavaScript'],
  },
};

export const ManyCategories: Story = {
  args: {
    categories: ['TypeScript', 'Angular', 'Testing', 'Clean Code', 'Architecture', 'Performance'],
  },
};

export const WithMaxVisible: Story = {
  args: {
    categories: ['TypeScript', 'Angular', 'Testing', 'Clean Code', 'Architecture', 'Performance'],
    maxVisible: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Limits visible chips to 3, showing "+3" overflow indicator with tooltip.',
      },
    },
  },
};

export const MaxVisibleEqualsCategories: Story = {
  args: {
    categories: ['TypeScript', 'Angular', 'Testing'],
    maxVisible: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'When maxVisible equals category count, no overflow indicator is shown.',
      },
    },
  },
};

export const Empty: Story = {
  args: {
    categories: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders nothing when categories array is empty.',
      },
    },
  },
};

export const LongCategoryNames: Story = {
  args: {
    categories: [
      'Software Architecture Patterns',
      'Test-Driven Development',
      'Domain-Driven Design',
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Handles long category names gracefully.',
      },
    },
  },
};
