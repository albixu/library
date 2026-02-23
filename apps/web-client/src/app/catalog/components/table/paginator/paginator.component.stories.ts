import type { Meta, StoryObj } from '@storybook/angular';
import { PaginatorComponent } from './paginator.component';

const meta: Meta<PaginatorComponent> = {
  title: 'Catalog/Table/Paginator',
  component: PaginatorComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Pagination component with page size selector and navigation controls.

## Features
- Page size selector with customizable options
- First, previous, next, last page navigation
- Range label showing current items
- Disabled state support
- Full keyboard accessibility

## Usage
\`\`\`html
<app-paginator
  [pageIndex]="currentPage"
  [pageSize]="itemsPerPage"
  [totalItems]="totalBooks"
  (page)="onPageChange($event)" />

<app-paginator
  [pageIndex]="0"
  [pageSize]="50"
  [totalItems]="1000"
  [pageSizeOptions]="[25, 50, 100]"
  (page)="handlePage($event)" />
\`\`\`

## Page Event
The \`page\` output emits a \`PageEvent\` object with:
- \`pageIndex\`: New page index
- \`previousPageIndex\`: Previous page index
- \`pageSize\`: Current page size
- \`length\`: Total items
        `,
      },
    },
  },
  argTypes: {
    pageIndex: {
      description: 'Current page index (0-based)',
      control: { type: 'number' },
    },
    pageSize: {
      description: 'Number of items per page',
      control: { type: 'number' },
    },
    totalItems: {
      description: 'Total number of items',
      control: { type: 'number' },
    },
    pageSizeOptions: {
      description: 'Available page size options',
      control: { type: 'object' },
    },
    disabled: {
      description: 'Disables all pagination controls',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<PaginatorComponent>;

export const Default: Story = {
  args: {
    pageIndex: 0,
    pageSize: 25,
    totalItems: 100,
    pageSizeOptions: [25, 50, 100],
  },
};

export const MiddlePage: Story = {
  args: {
    pageIndex: 2,
    pageSize: 25,
    totalItems: 150,
    pageSizeOptions: [25, 50, 100],
  },
  parameters: {
    docs: {
      description: {
        story: 'Paginator showing a middle page with all navigation enabled.',
      },
    },
  },
};

export const LastPage: Story = {
  args: {
    pageIndex: 3,
    pageSize: 25,
    totalItems: 100,
    pageSizeOptions: [25, 50, 100],
  },
  parameters: {
    docs: {
      description: {
        story: 'On last page - next and last buttons are disabled.',
      },
    },
  },
};

export const FirstPage: Story = {
  args: {
    pageIndex: 0,
    pageSize: 25,
    totalItems: 100,
    pageSizeOptions: [25, 50, 100],
  },
  parameters: {
    docs: {
      description: {
        story: 'On first page - first and previous buttons are disabled.',
      },
    },
  },
};

export const SinglePage: Story = {
  args: {
    pageIndex: 0,
    pageSize: 25,
    totalItems: 15,
    pageSizeOptions: [25, 50, 100],
  },
  parameters: {
    docs: {
      description: {
        story: 'Only one page exists - all navigation buttons are disabled.',
      },
    },
  },
};

export const NoItems: Story = {
  args: {
    pageIndex: 0,
    pageSize: 25,
    totalItems: 0,
    pageSizeOptions: [25, 50, 100],
  },
  parameters: {
    docs: {
      description: {
        story: 'No items - shows "0 of 0".',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    pageIndex: 1,
    pageSize: 25,
    totalItems: 100,
    pageSizeOptions: [25, 50, 100],
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'All controls disabled during loading or other operations.',
      },
    },
  },
};

export const CustomPageSizes: Story = {
  args: {
    pageIndex: 0,
    pageSize: 10,
    totalItems: 500,
    pageSizeOptions: [10, 20, 50, 100, 200],
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom page size options for different use cases.',
      },
    },
  },
};

export const LargeDataset: Story = {
  args: {
    pageIndex: 50,
    pageSize: 100,
    totalItems: 10000,
    pageSizeOptions: [50, 100, 200],
  },
  parameters: {
    docs: {
      description: {
        story: 'Large dataset showing items 5001-5100 of 10,000.',
      },
    },
  },
};
