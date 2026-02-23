import type { Meta, StoryObj } from '@storybook/angular';
import { BookTableComponent } from './book-table.component';
import { Book } from '../../../../core/models/index.js';

const sampleBooks: Book[] = [
  {
    id: '1',
    isbn: '978-0132350884',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    authors: [{ id: '1', name: 'Robert C. Martin' }],
    type: 'Book',
    categories: [
      { id: '1', name: 'Software Engineering' },
      { id: '2', name: 'Clean Code' },
      { id: '3', name: 'Best Practices' },
    ],
    level: 'Intermediate',
    format: 'pdf',
    language: 'en',
    originalDescription: 'A comprehensive guide to writing clean, maintainable code.',
    description: 'A comprehensive guide to writing clean, maintainable code.',
    available: true,
    similarityScore: null,
  },
  {
    id: '2',
    isbn: '978-0201633610',
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    authors: [
      { id: '2', name: 'Erich Gamma' },
      { id: '3', name: 'Richard Helm' },
      { id: '4', name: 'Ralph Johnson' },
      { id: '5', name: 'John Vlissides' },
    ],
    type: 'Book',
    categories: [
      { id: '4', name: 'Design Patterns' },
      { id: '5', name: 'Architecture' },
    ],
    level: 'Advanced',
    format: 'epub',
    language: 'en',
    originalDescription: 'The classic Gang of Four book on software design patterns.',
    description: 'The classic Gang of Four book on software design patterns.',
    available: true,
    similarityScore: null,
  },
  {
    id: '3',
    isbn: '978-8441540033',
    title: 'Arquitectura Limpia',
    authors: [{ id: '1', name: 'Robert C. Martin' }],
    type: 'Book',
    categories: [
      { id: '6', name: 'Arquitectura' },
      { id: '7', name: 'Software' },
    ],
    level: 'Advanced',
    format: 'pdf',
    language: 'es',
    originalDescription: 'Principios del diseño y la arquitectura de software.',
    description: 'Principios del diseño y la arquitectura de software.',
    available: true,
    similarityScore: null,
  },
  {
    id: '4',
    isbn: null,
    title: 'JavaScript: The Good Parts',
    authors: [{ id: '6', name: 'Douglas Crockford' }],
    type: 'Book',
    categories: [
      { id: '8', name: 'JavaScript' },
      { id: '9', name: 'Web Development' },
    ],
    level: 'Beginner',
    format: 'mobi',
    language: 'en',
    originalDescription: '',
    description: '',
    available: true,
    similarityScore: null,
  },
  {
    id: '5',
    isbn: '978-0135957059',
    title: 'The Pragmatic Programmer',
    authors: [
      { id: '7', name: 'David Thomas' },
      { id: '8', name: 'Andrew Hunt' },
    ],
    type: 'Book',
    categories: [
      { id: '1', name: 'Software Engineering' },
      { id: '10', name: 'Career' },
    ],
    level: 'Intermediate',
    format: 'epub',
    language: 'en',
    originalDescription: 'Your journey to mastery in software development.',
    description: 'Your journey to mastery in software development.',
    available: true,
    similarityScore: null,
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
- **Level**: Level badge (beginner/intermediate/advanced/compound levels)
- **Format**: Format icon (pdf/epub/mobi/azw3/etc.)
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
        isbn: null,
        title: 'Refactoring',
        authors: [{ id: '9', name: 'Martin Fowler' }],
        type: 'Book',
        categories: [
          { id: '11', name: 'Refactoring' },
          { id: '1', name: 'Software Engineering' },
        ],
        level: 'Intermediate',
        format: 'pdf',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '7',
        isbn: '978-0321125217',
        title: 'Domain-Driven Design',
        authors: [{ id: '10', name: 'Eric Evans' }],
        type: 'Book',
        categories: [
          { id: '12', name: 'DDD' },
          { id: '5', name: 'Architecture' },
        ],
        level: 'Advanced',
        format: 'epub',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '8',
        isbn: null,
        title: 'Test-Driven Development',
        authors: [{ id: '11', name: 'Kent Beck' }],
        type: 'Book',
        categories: [
          { id: '13', name: 'TDD' },
          { id: '14', name: 'Testing' },
        ],
        level: 'Intermediate',
        format: 'pdf',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
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
        isbn: null,
        title: 'Clean Code',
        authors: [{ id: '1', name: 'Robert C. Martin' }],
        type: 'Book',
        categories: [{ id: '1', name: 'Software Engineering' }],
        level: 'Intermediate',
        format: 'pdf',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '2',
        isbn: null,
        title: 'Código Limpio',
        authors: [{ id: '1', name: 'Robert C. Martin' }],
        type: 'Book',
        categories: [{ id: '15', name: 'Ingeniería de Software' }],
        level: 'Intermediate',
        format: 'epub',
        language: 'es',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '3',
        isbn: null,
        title: 'Code Propre',
        authors: [{ id: '1', name: 'Robert C. Martin' }],
        type: 'Book',
        categories: [{ id: '16', name: 'Génie Logiciel' }],
        level: 'Intermediate',
        format: 'pdf',
        language: 'fr',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '4',
        isbn: null,
        title: 'Clean Code',
        authors: [{ id: '1', name: 'Robert C. Martin' }],
        type: 'Book',
        categories: [{ id: '1', name: 'Software Engineering' }],
        level: 'Intermediate',
        format: 'mobi',
        language: 'de',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
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
        isbn: null,
        title: 'JavaScript for Beginners',
        authors: [{ id: '12', name: 'John Smith' }],
        type: 'Book',
        categories: [{ id: '8', name: 'JavaScript' }],
        level: 'Beginner',
        format: 'pdf',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '2',
        isbn: null,
        title: 'JavaScript: Getting Started',
        authors: [{ id: '12', name: 'John Smith' }],
        type: 'Book',
        categories: [{ id: '8', name: 'JavaScript' }],
        level: 'Beginner to Intermediate',
        format: 'epub',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '3',
        isbn: null,
        title: 'Advanced TypeScript',
        authors: [{ id: '13', name: 'Jane Developer' }],
        type: 'Book',
        categories: [{ id: '17', name: 'TypeScript' }],
        level: 'Intermediate',
        format: 'epub',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '4',
        isbn: null,
        title: 'TypeScript Mastery',
        authors: [{ id: '13', name: 'Jane Developer' }],
        type: 'Book',
        categories: [{ id: '17', name: 'TypeScript' }],
        level: 'Intermediate to Advanced',
        format: 'pdf',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
      {
        id: '5',
        isbn: null,
        title: 'Expert Angular Patterns',
        authors: [{ id: '14', name: 'Angular Team' }],
        type: 'Book',
        categories: [{ id: '18', name: 'Angular' }],
        level: 'Advanced',
        format: 'pdf',
        language: 'en',
        originalDescription: '',
        description: '',
        available: true,
        similarityScore: null,
      },
    ],
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Books showing all level badges including compound levels.',
      },
    },
  },
};
