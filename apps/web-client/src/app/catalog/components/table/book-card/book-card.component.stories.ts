import type { Meta, StoryObj } from '@storybook/angular';
import { BookCardComponent } from './book-card.component';
import { Book } from '../../../../core/models/index.js';

const sampleBook: Book = {
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
  description:
    'A comprehensive guide to writing clean, maintainable code. Learn how to write code that is easy to read, understand, and modify.',
  available: true,
  similarityScore: null,
};

const meta: Meta<BookCardComponent> = {
  title: 'Catalog/Table/BookCard',
  component: BookCardComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Mobile-optimized card component for displaying book information.

## Features
- Displays book metadata: title, authors, description
- Integrates data-display components: format icon, language flag, level badge, category chips
- Send to Kindle action button
- Selected state with visual feedback
- Ripple effect on interaction
- Full keyboard accessibility

## Usage
\`\`\`html
<app-book-card
  [book]="book"
  (bookSelect)="onBookSelect($event)"
  (sendToKindle)="onSendToKindle($event)" />

<app-book-card
  [book]="book"
  [selected]="true" />
\`\`\`

## Book Interface
\`\`\`typescript
interface Book {
  id: string;
  isbn: string | null;
  title: string;
  authors: Author[];
  type: string;
  categories: Category[];
  level: BookLevelName | null;
  format: BookFormat;
  originalDescription: string;
  description: string;
  language: string;
  available: boolean;
  similarityScore: number | null;
}
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    book: {
      description: 'Book data to display',
      control: { type: 'object' },
    },
    selected: {
      description: 'Whether the card is selected',
      control: { type: 'boolean' },
    },
  },
  decorators: [
    (story) => ({
      template: `<div style="max-width: 350px;">${story().template || ''}</div>`,
      props: story().props,
      moduleMetadata: story().moduleMetadata,
    }),
  ],
};

export default meta;
type Story = StoryObj<BookCardComponent>;

export const Default: Story = {
  args: {
    book: sampleBook,
  },
};

export const Selected: Story = {
  args: {
    book: sampleBook,
    selected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Card in selected state with highlighted background.',
      },
    },
  },
};

export const MinimalBook: Story = {
  args: {
    book: {
      id: '2',
      isbn: null,
      title: 'TypeScript Handbook',
      authors: [{ id: '2', name: 'Microsoft' }],
      type: 'Book',
      categories: [{ id: '4', name: 'TypeScript' }],
      level: null,
      format: 'pdf',
      language: 'en',
      originalDescription: '',
      description: '',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Book with minimal information (no level or description).',
      },
    },
  },
};

export const MultipleAuthors: Story = {
  args: {
    book: {
      id: '3',
      isbn: '978-0201633610',
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      authors: [
        { id: '3', name: 'Erich Gamma' },
        { id: '4', name: 'Richard Helm' },
        { id: '5', name: 'Ralph Johnson' },
        { id: '6', name: 'John Vlissides' },
      ],
      type: 'Book',
      categories: [
        { id: '5', name: 'Design Patterns' },
        { id: '6', name: 'Architecture' },
      ],
      level: 'Advanced',
      format: 'epub',
      language: 'en',
      originalDescription: 'Classic book on design patterns.',
      description: 'Classic book on design patterns.',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Book with multiple authors (Gang of Four).',
      },
    },
  },
};

export const SpanishBook: Story = {
  args: {
    book: {
      id: '4',
      isbn: '978-8441540033',
      title: 'Arquitectura Limpia',
      authors: [{ id: '1', name: 'Robert C. Martin' }],
      type: 'Book',
      categories: [
        { id: '7', name: 'Arquitectura' },
        { id: '8', name: 'Software' },
      ],
      level: 'Advanced',
      format: 'pdf',
      language: 'es',
      originalDescription:
        'Una guía para desarrolladores sobre los principios del diseño y la arquitectura de software.',
      description:
        'Una guía para desarrolladores sobre los principios del diseño y la arquitectura de software.',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Spanish language book with Spanish flag.',
      },
    },
  },
};

export const BeginnerLevel: Story = {
  args: {
    book: {
      id: '5',
      isbn: null,
      title: 'JavaScript for Beginners',
      authors: [{ id: '7', name: 'John Smith' }],
      type: 'Book',
      categories: [
        { id: '9', name: 'JavaScript' },
        { id: '10', name: 'Web Development' },
      ],
      level: 'Beginner',
      format: 'mobi',
      language: 'en',
      originalDescription:
        'Start your journey into programming with this beginner-friendly guide to JavaScript.',
      description:
        'Start your journey into programming with this beginner-friendly guide to JavaScript.',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Beginner level book with green badge.',
      },
    },
  },
};

export const BeginnerToIntermediateLevel: Story = {
  args: {
    book: {
      id: '5b',
      isbn: null,
      title: 'Modern JavaScript: From Basics to Beyond',
      authors: [{ id: '7', name: 'John Smith' }],
      type: 'Book',
      categories: [
        { id: '9', name: 'JavaScript' },
        { id: '10', name: 'Web Development' },
      ],
      level: 'Beginner to intermediate',
      format: 'epub',
      language: 'en',
      originalDescription:
        'A progressive guide that takes you from JavaScript basics to intermediate concepts.',
      description:
        'A progressive guide that takes you from JavaScript basics to intermediate concepts.',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Beginner to Intermediate level book with teal badge.',
      },
    },
  },
};

export const ManyCategories: Story = {
  args: {
    book: {
      id: '6',
      isbn: null,
      title: 'Full Stack Development',
      authors: [{ id: '8', name: 'Jane Developer' }],
      type: 'Book',
      categories: [
        { id: '11', name: 'JavaScript' },
        { id: '12', name: 'TypeScript' },
        { id: '13', name: 'React' },
        { id: '14', name: 'Node.js' },
        { id: '15', name: 'PostgreSQL' },
        { id: '16', name: 'Docker' },
      ],
      level: 'Intermediate',
      format: 'pdf',
      language: 'en',
      originalDescription: '',
      description: '',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Book with many categories - only first 2 shown with overflow indicator.',
      },
    },
  },
};

export const LongDescription: Story = {
  args: {
    book: {
      id: '7',
      isbn: '978-0135957059',
      title: 'The Pragmatic Programmer',
      authors: [
        { id: '9', name: 'David Thomas' },
        { id: '10', name: 'Andrew Hunt' },
      ],
      type: 'Book',
      categories: [{ id: '1', name: 'Software Engineering' }],
      level: 'Intermediate',
      format: 'epub',
      language: 'en',
      originalDescription:
        'A comprehensive guide covering dozens of practical tips for improving your programming skills.',
      description:
        'A comprehensive guide covering dozens of practical tips for improving your programming skills. This book teaches you how to be a better programmer through real-world examples, insightful advice, and practical exercises that will transform the way you approach software development.',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Long description is truncated to 2 lines.',
      },
    },
  },
};

export const LongTitle: Story = {
  args: {
    book: {
      id: '8',
      isbn: '978-0321125217',
      title:
        'Domain-Driven Design: Tackling Complexity in the Heart of Software - A Comprehensive Guide to Building Enterprise Applications',
      authors: [{ id: '11', name: 'Eric Evans' }],
      type: 'Book',
      categories: [
        { id: '17', name: 'DDD' },
        { id: '6', name: 'Architecture' },
      ],
      level: 'Advanced',
      format: 'pdf',
      language: 'en',
      originalDescription: 'The classic book on Domain-Driven Design.',
      description: 'The classic book on Domain-Driven Design.',
      available: true,
      similarityScore: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Book with very long title.',
      },
    },
  },
};
