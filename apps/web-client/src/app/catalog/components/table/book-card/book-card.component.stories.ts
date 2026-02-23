import type { Meta, StoryObj } from '@storybook/angular';
import { BookCardComponent, Book } from './book-card.component';

const sampleBook: Book = {
  id: '1',
  title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
  authors: ['Robert C. Martin'],
  categories: ['Software Engineering', 'Clean Code', 'Best Practices'],
  level: 'Intermediate',
  format: 'PDF',
  language: 'en',
  description: 'A comprehensive guide to writing clean, maintainable code. Learn how to write code that is easy to read, understand, and modify.',
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
  (select)="onBookSelect($event)"
  (sendToKindle)="onSendToKindle($event)" />

<app-book-card
  [book]="book"
  [selected]="true" />
\`\`\`

## Book Interface
\`\`\`typescript
interface Book {
  id: string;
  title: string;
  authors: string[];
  categories: string[];
  level?: BookLevel;
  format?: BookFormat;
  language?: LanguageCode;
  description?: string;
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
      title: 'TypeScript Handbook',
      authors: ['Microsoft'],
      categories: ['TypeScript'],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Book with minimal information (no format, level, language, or description).',
      },
    },
  },
};

export const MultipleAuthors: Story = {
  args: {
    book: {
      id: '3',
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      authors: ['Erich Gamma', 'Richard Helm', 'Ralph Johnson', 'John Vlissides'],
      categories: ['Design Patterns', 'Architecture'],
      level: 'Advanced',
      format: 'EPUB',
      language: 'en',
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
      title: 'Arquitectura Limpia',
      authors: ['Robert C. Martin'],
      categories: ['Arquitectura', 'Software'],
      level: 'Advanced',
      format: 'PDF',
      language: 'es',
      description: 'Una guía para desarrolladores sobre los principios del diseño y la arquitectura de software.',
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
      title: 'JavaScript for Beginners',
      authors: ['John Smith'],
      categories: ['JavaScript', 'Web Development'],
      level: 'Beginner',
      format: 'MOBI',
      language: 'en',
      description: 'Start your journey into programming with this beginner-friendly guide to JavaScript.',
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

export const ManyCategories: Story = {
  args: {
    book: {
      id: '6',
      title: 'Full Stack Development',
      authors: ['Jane Developer'],
      categories: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
      level: 'Intermediate',
      format: 'PDF',
      language: 'en',
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
      title: 'The Pragmatic Programmer',
      authors: ['David Thomas', 'Andrew Hunt'],
      categories: ['Software Engineering'],
      level: 'Intermediate',
      format: 'EPUB',
      language: 'en',
      description: 'A comprehensive guide covering dozens of practical tips for improving your programming skills. This book teaches you how to be a better programmer through real-world examples, insightful advice, and practical exercises that will transform the way you approach software development.',
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
      title: 'Domain-Driven Design: Tackling Complexity in the Heart of Software - A Comprehensive Guide to Building Enterprise Applications',
      authors: ['Eric Evans'],
      categories: ['DDD', 'Architecture'],
      level: 'Advanced',
      format: 'PDF',
      language: 'en',
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
