import type { Meta, StoryObj } from '@storybook/angular';
import { BookTableComponent } from './book-table.component';
import { Book } from '../book-card/book-card.component.js';

const sampleBooks: Book[] = [
  {
    id: '1',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    authors: ['Robert C. Martin'],
    categories: ['Software Engineering', 'Clean Code', 'Best Practices'],
    level: 'Intermediate',
    format: 'PDF',
    language: 'en',
    description: 'A comprehensive guide to writing clean, maintainable code.',
  },
  {
    id: '2',
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    authors: ['Erich Gamma', 'Richard Helm', 'Ralph Johnson', 'John Vlissides'],
    categories: ['Design Patterns', 'Architecture'],
    level: 'Advanced',
    format: 'EPUB',
    language: 'en',
    description: 'The classic Gang of Four book on software design patterns.',
  },
  {
    id: '3',
    title: 'Arquitectura Limpia',
    authors: ['Robert C. Martin'],
    categories: ['Arquitectura', 'Software'],
    level: 'Advanced',
    format: 'PDF',
    language: 'es',
    description: 'Principios del diseño y la arquitectura de software.',
  },
  {
    id: '4',
    title: 'JavaScript: The Good Parts',
    authors: ['Douglas Crockford'],
    categories: ['JavaScript', 'Web Development'],
    level: 'Beginner',
    format: 'MOBI',
    language: 'en',
  },
  {
    id: '5',
    title: 'The Pragmatic Programmer',
    authors: ['David Thomas', 'Andrew Hunt'],
    categories: ['Software Engineering', 'Career'],
    level: 'Intermediate',
    format: 'EPUB',
    language: 'en',
    description: 'Your journey to mastery in software development.',
  },
];

const meta: Meta<BookTableComponent> = {
  title: 'Catalog/Table/BookTable',
  component: BookTableComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Desktop-optimized table component for displaying books in a data grid.

## Features
- Material Design table with sorting-ready columns
- Displays all book metadata with data-display components
- Loading overlay integration
- Empty state handling (empty, no-results, initial)
- Send to Kindle action per row
- Row click selection
- Full keyboard accessibility

## Columns
- **Title**: Book title with truncated description
- **Authors**: Comma-separated author names
- **Categories**: Category chips (max 2 visible)
- **Level**: Level badge (beginner/intermediate/advanced)
- **Format**: Format icon (pdf/epub/mobi/azw3)
- **Language**: Language flag
- **Actions**: Send to Kindle button

## Usage
\`\`\`html
<app-book-table
  [books]="books"
  [loading]="isLoading"
  [emptyStateType]="'no-results'"
  (rowClick)="onBookClick($event)"
  (sendToKindle)="onSendToKindle($event)" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    books: {
      description: 'Array of books to display',
      control: { type: 'object' },
    },
    loading: {
      description: 'Shows loading overlay when true',
      control: { type: 'boolean' },
    },
    emptyStateType: {
      description: 'Type of empty state to show when no books',
      control: { type: 'select' },
      options: ['empty', 'no-results', 'initial'],
    },
  },
};

export default meta;
type Story = StoryObj<BookTableComponent>;

export const Default: Story = {
  args: {
    books: sampleBooks,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    books: sampleBooks,
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Table with loading overlay while fetching data.',
      },
    },
  },
};

export const Empty: Story = {
  args: {
    books: [],
    loading: false,
    emptyStateType: 'empty',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty library state - no books added yet.',
      },
    },
  },
};

export const NoResults: Story = {
  args: {
    books: [],
    loading: false,
    emptyStateType: 'no-results',
  },
  parameters: {
    docs: {
      description: {
        story: 'No results found after search/filter.',
      },
    },
  },
};

export const InitialState: Story = {
  args: {
    books: [],
    loading: false,
    emptyStateType: 'initial',
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state before user starts searching.',
      },
    },
  },
};

export const SingleBook: Story = {
  args: {
    books: [sampleBooks[0]],
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Table with only one book.',
      },
    },
  },
};

export const ManyBooks: Story = {
  args: {
    books: [
      ...sampleBooks,
      {
        id: '6',
        title: 'Refactoring',
        authors: ['Martin Fowler'],
        categories: ['Refactoring', 'Software Engineering'],
        level: 'Intermediate',
        format: 'PDF',
        language: 'en',
      },
      {
        id: '7',
        title: 'Domain-Driven Design',
        authors: ['Eric Evans'],
        categories: ['DDD', 'Architecture'],
        level: 'Advanced',
        format: 'EPUB',
        language: 'en',
      },
      {
        id: '8',
        title: 'Test-Driven Development',
        authors: ['Kent Beck'],
        categories: ['TDD', 'Testing'],
        level: 'Intermediate',
        format: 'PDF',
        language: 'en',
      },
    ],
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Table with many books showing scrollable content.',
      },
    },
  },
};

export const LoadingEmptyTable: Story = {
  args: {
    books: [],
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state with no existing data.',
      },
    },
  },
};

export const MixedLanguages: Story = {
  args: {
    books: [
      {
        id: '1',
        title: 'Clean Code',
        authors: ['Robert C. Martin'],
        categories: ['Software Engineering'],
        level: 'Intermediate',
        format: 'PDF',
        language: 'en',
      },
      {
        id: '2',
        title: 'Código Limpio',
        authors: ['Robert C. Martin'],
        categories: ['Ingeniería de Software'],
        level: 'Intermediate',
        format: 'EPUB',
        language: 'es',
      },
      {
        id: '3',
        title: 'Code Propre',
        authors: ['Robert C. Martin'],
        categories: ['Génie Logiciel'],
        level: 'Intermediate',
        format: 'PDF',
        language: 'fr',
      },
      {
        id: '4',
        title: 'Clean Code',
        authors: ['Robert C. Martin'],
        categories: ['Software Engineering'],
        level: 'Intermediate',
        format: 'MOBI',
        language: 'de',
      },
    ],
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Books in multiple languages showing different flags.',
      },
    },
  },
};

export const AllLevels: Story = {
  args: {
    books: [
      {
        id: '1',
        title: 'JavaScript for Beginners',
        authors: ['John Smith'],
        categories: ['JavaScript'],
        level: 'Beginner',
        format: 'PDF',
        language: 'en',
      },
      {
        id: '2',
        title: 'Advanced TypeScript',
        authors: ['Jane Developer'],
        categories: ['TypeScript'],
        level: 'Intermediate',
        format: 'EPUB',
        language: 'en',
      },
      {
        id: '3',
        title: 'Expert Angular Patterns',
        authors: ['Angular Team'],
        categories: ['Angular'],
        level: 'Advanced',
        format: 'PDF',
        language: 'en',
      },
    ],
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Books showing all three level badges.',
      },
    },
  },
};
