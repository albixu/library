# Dialog Components

Documentation for dialog components used in the Library web client.

## SendToKindleDialogComponent

A modal dialog for sending books to a Kindle device via email.

### Location
`apps/web-client/src/app/catalog/components/dialogs/send-to-kindle-dialog/`

### Purpose
Allows users to send available books to their Kindle device by providing their Kindle email address. The dialog handles email validation, displays appropriate warnings, and provides feedback on the send operation.

### Features
- Email input with validation
- Warning for non-@kindle.com emails (still allows sending)
- Loading spinner during send operation
- Success/error result display
- Unavailable book warning
- Accessible with proper ARIA labels

### Inputs
Receives a `Book` object via `MAT_DIALOG_DATA`:

```typescript
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
  available: boolean;  // Must be true to enable sending
  similarityScore: number | null;
}
```

### Output
Returns `SendToKindleDialogResult` on successful close, or `undefined` if cancelled:

```typescript
interface SendToKindleDialogResult {
  success: boolean;
  email: string;
}
```

### Usage Example

```typescript
import { MatDialog } from '@angular/material/dialog';
import { SendToKindleDialogComponent } from './dialogs';

@Component({...})
export class BookListComponent {
  private dialog = inject(MatDialog);

  sendToKindle(book: Book): void {
    const dialogRef = this.dialog.open(SendToKindleDialogComponent, {
      data: book,
      width: '400px',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        console.log(`Book sent to ${result.email}`);
        // Show success notification
      }
    });
  }
}
```

### States

| State | Description | UI Elements |
|-------|-------------|-------------|
| `input` | Initial state, user enters email | Email input, Cancel/Send buttons |
| `sending` | Request in progress | Loading spinner, disabled buttons |
| `success` | Book sent successfully | Success message, Close button |
| `error` | Send failed | Error message, Close button |

### Validation Rules

1. **Required**: Email field cannot be empty
2. **Format**: Must be a valid email format (user@domain.com)
3. **Kindle Domain Warning**: Shows informational warning if email doesn't end with @kindle.com or @kindle.cn
4. **Book Availability**: Send button is disabled if `book.available === false`

### Dependencies

- `@angular/material/dialog` - MatDialogModule
- `@angular/material/form-field` - MatFormFieldModule
- `@angular/material/input` - MatInputModule
- `@angular/material/button` - MatButtonModule
- `@angular/material/icon` - MatIconModule
- `@angular/material/progress-spinner` - MatProgressSpinnerModule
- `KindleService` - Service for sending books to Kindle

### Accessibility

- Email input has `aria-label="Kindle email address"`
- Email input is connected to hint via `aria-describedby`
- All buttons have proper text content or aria-labels
- Focus is properly managed within the dialog

### Storybook Stories

Available in Storybook under `Catalog/Dialogs/SendToKindleDialog`:

- **Default**: Available book, ready for input
- **UnavailableBook**: Shows unavailable warning, send disabled
- **LongTitle**: Handles long book titles gracefully
- **DarkTheme**: Dialog in dark mode

### Theming

The component uses CSS custom properties for theming:

```css
/* Success/error colors */
--mat-sys-primary
--mat-sys-error
--mat-sys-error-container
--mat-sys-on-error-container

/* Warning banner colors */
--mat-sys-tertiary-container
--mat-sys-on-tertiary-container

/* Surface colors */
--mat-sys-on-surface
--mat-sys-on-surface-variant
```
