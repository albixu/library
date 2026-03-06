import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

import { SendToKindleDialogComponent } from './send-to-kindle-dialog.component';
import { KindleService } from '../../../../core/services/kindle.service';
import { Book } from '../../../../core/models/index.js';

// Mock books for stories
const availableBook: Book = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  isbn: '978-0-13-468599-1',
  title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
  authors: [{ id: '1', name: 'Robert C. Martin' }],
  type: 'technical',
  categories: [{ id: '1', name: 'Software Engineering' }],
  level: 'Intermediate',
  format: 'epub',
  originalDescription: 'A handbook of agile software craftsmanship',
  description: 'A handbook of agile software craftsmanship',
  language: 'en',
  available: true,
  similarityScore: null,
};

const unavailableBook: Book = {
  ...availableBook,
  id: '223e4567-e89b-12d3-a456-426614174001',
  title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
  available: false,
};

const longTitleBook: Book = {
  ...availableBook,
  id: '323e4567-e89b-12d3-a456-426614174002',
  title:
    'The Complete Guide to Understanding Modern JavaScript Frameworks and Their Ecosystem: A Comprehensive Study',
};

// Mock dialog ref with simple logging
const mockDialogRef = {
  close: (result?: unknown): void => {
    console.log('[Storybook] Dialog closed with result:', result);
  },
};

const meta: Meta<SendToKindleDialogComponent> = {
  title: 'Catalog/Dialogs/SendToKindleDialog',
  component: SendToKindleDialogComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      providers: [KindleService, { provide: DialogRef, useValue: mockDialogRef }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
A modal dialog for sending books to a Kindle device.

## Features
- Email input with validation
- Warning for non-kindle emails (@kindle.com recommended)
- Loading spinner while sending
- Success/error result display
- Accessible with proper ARIA labels

## Usage
\`\`\`typescript
import { DialogService } from '@core/services';
import { SendToKindleDialogComponent } from './send-to-kindle-dialog.component';

@Component({...})
export class MyComponent {
  private dialogService = inject(DialogService);

  sendToKindle(book: Book) {
    const dialogRef = this.dialogService.open(SendToKindleDialogComponent, {
      data: book,
      width: '400px'
    });

    dialogRef.closed.subscribe(result => {
      if (result?.success) {
        console.log('Book sent to:', result.email);
      }
    });
  }
}
\`\`\`

## States
1. **Input** - User enters email and clicks send
2. **Sending** - Loading spinner while request is in progress
3. **Success** - Confirmation message with close button
4. **Error** - Error message with close button
        `,
      },
    },
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<SendToKindleDialogComponent>;

/**
 * Default dialog with an available book.
 */
export const Default: Story = {
  decorators: [
    moduleMetadata({
      providers: [{ provide: DIALOG_DATA, useValue: availableBook }],
    }),
  ],
};

/**
 * Dialog showing an unavailable book with warning.
 */
export const UnavailableBook: Story = {
  decorators: [
    moduleMetadata({
      providers: [{ provide: DIALOG_DATA, useValue: unavailableBook }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'When a book is not available, a warning banner is shown and the send button is disabled.',
      },
    },
  },
};

/**
 * Dialog with a book that has a long title.
 */
export const LongTitle: Story = {
  decorators: [
    moduleMetadata({
      providers: [{ provide: DIALOG_DATA, useValue: longTitleBook }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        story: 'The dialog handles long book titles gracefully.',
      },
    },
  },
};

/**
 * Dark theme variant.
 */
export const DarkTheme: Story = {
  decorators: [
    moduleMetadata({
      providers: [{ provide: DIALOG_DATA, useValue: availableBook }],
    }),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'The dialog adapts to dark theme using CSS custom properties.',
      },
    },
  },
};
