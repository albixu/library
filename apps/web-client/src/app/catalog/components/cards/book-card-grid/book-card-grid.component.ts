import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BookCoverCardComponent } from '../book-cover-card/book-cover-card.component.js';
import { Book } from '../../../../core/models/index.js';

@Component({
  selector: 'app-book-card-grid',
  standalone: true,
  imports: [BookCoverCardComponent],
  template: `
    <div class="book-card-grid" role="list" aria-label="Lista de libros">
      @for (book of books(); track book.id) {
        <div
          role="listitem"
          class="grid-item"
          tabindex="0"
          (click)="bookSelect.emit(book)"
          (keyup.enter)="bookSelect.emit(book)"
          (keydown.space)="bookSelect.emit(book); $event.preventDefault()"
        >
          <app-book-cover-card
            [book]="book"
            (sendToKindle)="sendToKindle.emit($event)"
            (favoriteToggle)="favoriteToggle.emit($event)"
          />
        </div>
      } @empty {
        <p class="empty-message">No se encontraron libros.</p>
      }
    </div>
  `,
  styles: `
    .book-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
      padding: 0.5rem 0;
      width: 100%;
    }

    .grid-item {
      cursor: pointer;
      border-radius: 0.75rem;
      transition: transform 0.15s ease;

      &:hover {
        transform: translateY(-2px);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent, #17a1cf);
        outline-offset: 2px;
        border-radius: 0.75rem;
      }
    }

    .empty-message {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--color-text-muted, rgb(100 116 139));
      padding: 2rem 0;
      font-size: 0.9375rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCardGridComponent {
  readonly books = input.required<Book[]>();

  readonly bookSelect = output<Book>();
  readonly sendToKindle = output<Book>();
  readonly favoriteToggle = output<{ book: Book; favorite: boolean }>();
}
