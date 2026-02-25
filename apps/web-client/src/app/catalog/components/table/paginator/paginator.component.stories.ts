import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PaginatorComponent } from './paginator.component';

const meta: Meta<PaginatorComponent> = {
  title: 'Catalog/Table/Paginator',
  component: PaginatorComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Cursor-based pagination component with "load more" functionality.

## Features
- Shows current vs total count (e.g., "Showing 25 of 120 items")
- "Load more" button when more pages available
- Fixed page size of 25 items
- Loading state with spinner
- Full keyboard accessibility

## Usage
\`\`\`html
<app-paginator
  [totalCount]="store.pagination().totalCount"
  [currentCount]="store.books().length"
  [hasNextPage]="store.pagination().hasNextPage"
  [loading]="store.loading()"
  (loadMore)="onLoadMore()" />
\`\`\`

## Events
- \`loadMore\`: Emitted when "Load more" button is clicked

## Page Size
The component uses a fixed page size of 25 items defined as \`PaginatorComponent.PAGE_SIZE\`.
        `,
      },
    },
  },
  argTypes: {
    totalCount: {
      description: 'Total number of items available',
      control: { type: 'number' },
    },
    currentCount: {
      description: 'Number of items currently loaded',
      control: { type: 'number' },
    },
    hasNextPage: {
      description: 'Whether more items can be loaded',
      control: { type: 'boolean' },
    },
    loading: {
      description: 'Shows loading spinner instead of load more button',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<PaginatorComponent>;

/**
 * Default state - partial data loaded with more available.
 */
export const Default: Story = {
  args: {
    totalCount: 120,
    currentCount: 25,
    hasNextPage: true,
    loading: false,
  },
};

/**
 * Loading state - spinner shown while fetching more data.
 */
export const Loading: Story = {
  args: {
    totalCount: 120,
    currentCount: 25,
    hasNextPage: true,
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows loading spinner while fetching the next page of results.',
      },
    },
  },
};

/**
 * All loaded - no more items to fetch.
 */
export const AllLoaded: Story = {
  args: {
    totalCount: 45,
    currentCount: 45,
    hasNextPage: false,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'All items loaded - no "Load more" button shown.',
      },
    },
  },
};

/**
 * Empty state - no items.
 */
export const NoItems: Story = {
  args: {
    totalCount: 0,
    currentCount: 0,
    hasNextPage: false,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'No items - shows "Showing 0 of 0 items".',
      },
    },
  },
};

/**
 * Large dataset with many items remaining.
 */
export const LargeDataset: Story = {
  args: {
    totalCount: 10000,
    currentCount: 200,
    hasNextPage: true,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large dataset with 200 of 10,000 items loaded.',
      },
    },
  },
};
