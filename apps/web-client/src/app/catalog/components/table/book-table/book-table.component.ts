import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CategoryChipsComponent } from '../../data-display/category-chips/category-chips.component.js';
import { LevelBadgeComponent } from '../../data-display/level-badge/level-badge.component.js';
import { LanguageFlagComponent } from '../../data-display/language-flag/language-flag.component.js';
import { TruncatedTextComponent } from '../../data-display/truncated-text/truncated-text.component.js';
import { EmptyStateComponent } from '../empty-state/empty-state.component.js';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay.component.js';
import { Book } from '../../../../core/models/index.js';

@Component({
  selector: 'app-book-table',
  standalone: true,
  imports: [
    CategoryChipsComponent,
    LevelBadgeComponent,
    LanguageFlagComponent,
    TruncatedTextComponent,
    EmptyStateComponent,
    LoadingOverlayComponent,
  ],
  template: `
    <div class="book-table-wrapper">
      <app-loading-overlay [visible]="loading()" message="Loading books..." />

      @if (books().length > 0) {
        <div class="book-table-container">
          <div class="table-scroll">
            <table aria-label="Books" class="book-table">
              <thead>
                <tr>
                  <th>ISBN</th>
                  <th>Book Details</th>
                  <th>Type / Category</th>
                  <th class="text-center">Lang</th>
                  <th>Level</th>
                  <th>Format</th>
                  <th>Description</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (book of books(); track book.id) {
                  <tr
                    class="book-row"
                    tabindex="0"
                    (click)="onRowClick(book)"
                    (keydown.enter)="onRowClick(book)"
                  >
                    <td class="isbn-column">
                      <span class="isbn-text">{{ book.isbn || '-' }}</span>
                    </td>
                    <td class="title-column">
                      <div class="title-cell">
                        <span class="book-title">{{ book.title }}</span>
                        <span class="book-author">{{ getAuthorNames(book) }}</span>
                      </div>
                    </td>
                    <td class="type-category-column">
                      <div class="type-category-cell">
                        <span class="book-type">{{ book.type || 'Unknown' }}</span>
                        <app-category-chips
                          [categories]="getCategoryNames(book)"
                          [maxVisible]="1"
                        />
                      </div>
                    </td>
                    <td class="language-column text-center">
                      <app-language-flag [languageCode]="book.language" />
                    </td>
                    <td class="level-column">
                      <app-level-badge [level]="book.level" />
                    </td>
                    <td class="format-column">
                      <span class="format-text">{{ book.format || '-' }}</span>
                    </td>
                    <td class="description-column">
                      @if (book.description) {
                        <app-truncated-text
                          [text]="book.description"
                          [maxLines]="1"
                          class="description-text"
                        />
                      } @else {
                        <span class="description-text">-</span>
                      }
                    </td>
                    <td class="actions-column text-right">
                      <button
                        class="action-button"
                        type="button"
                        aria-label="Send to Kindle"
                        title="Send to Kindle"
                        (click)="onSendToKindle($event, book)"
                      >
                        <span class="material-symbols-outlined">send_to_mobile</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else if (!loading()) {
        <app-empty-state [type]="emptyStateType()" />
      }
    </div>
  `,
  styles: `
    .book-table-wrapper {
      position: relative;
      min-height: 200px;
    }

    .book-table-container {
      background-color: #0f172a; /* slate-900 - FROM FIGMA */
      border-radius: 0.75rem; /* rounded-xl */
      border: 1px solid #1e293b; /* slate-800 - FROM FIGMA */
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* shadow-sm */
      overflow: hidden;
    }

    .table-scroll {
      overflow-x: auto;
    }

    .book-table {
      width: 100%;
      border-collapse: collapse;
    }

    // Row border separator - FROM FIGMA
    .book-table tbody tr {
      border-bottom: 1px solid #1e293b; /* slate-800 - FROM FIGMA */
    }

    .book-table tbody tr:last-child {
      border-bottom: none;
    }

    .book-row {
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: rgba(30, 41, 59, 0.4); /* slate-800/40 - FROM FIGMA */
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }

    .title-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      padding: 0.5rem 0;
    }

    .book-title {
      font-weight: 600; /* font-semibold */
      color: #f1f5f9; /* slate-100 - white text for dark mode - FROM FIGMA */
      font-size: 0.875rem; /* text-sm */
    }

    .book-author {
      font-size: 0.75rem; /* text-xs */
      color: #64748b; /* slate-500 - FROM FIGMA */
    }

    .type-category-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .book-type {
      font-size: 0.75rem; /* text-xs */
      font-weight: 500; /* font-medium */
      color: #cbd5e1; /* slate-300 - FROM FIGMA */
    }

    .format-text {
      font-size: 0.75rem; /* text-xs */
      color: #94a3b8; /* slate-400 - FROM FIGMA */
    }

    .isbn-text {
      font-size: 0.75rem; /* text-xs */
      font-family: 'Courier New', Courier, monospace; /* font-mono */
      color: #94a3b8; /* slate-400 - FROM FIGMA */
    }

    .description-text {
      font-size: 0.75rem; /* text-xs */
      color: #64748b; /* slate-500 - FROM FIGMA */
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .action-button {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.375rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #f1f5f9; /* slate-100 - FROM FIGMA for action icons */
      transition: all 0.15s ease;

      &:hover {
        background-color: rgba(30, 41, 59, 0.5);
        color: #17a1cf; /* primary/cyan color */
      }

      &:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .material-symbols-outlined {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    // Header cells styling - FROM FIGMA
    th {
      padding: 1rem 1.5rem; /* px-6 py-4 */
      font-size: 0.75rem; /* text-xs - 12px */
      font-weight: 600; /* font-semibold */
      text-transform: uppercase;
      letter-spacing: 0.05em; /* tracking-wider */
      color: #64748b; /* slate-500 - FROM FIGMA */
      background-color: rgba(30, 41, 59, 0.5); /* slate-800/50 - FROM FIGMA */
      border-bottom: 1px solid #334155; /* slate-700 - FROM FIGMA */
      text-align: left;
    }

    // Body cells styling
    td {
      padding: 1rem 1.5rem; /* px-6 py-4 */
      vertical-align: middle;
    }

    .actions-column {
      width: 80px;
    }

    .isbn-column {
      width: 140px;
    }

    .language-column {
      width: 80px;
    }

    .level-column {
      width: 140px;
    }

    .format-column {
      width: 100px;
    }

    .description-column {
      max-width: 250px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookTableComponent {
  readonly books = input<Book[]>([]);
  readonly loading = input<boolean>(false);
  readonly emptyStateType = input<'empty' | 'no-results' | 'initial'>('empty');

  readonly rowClick = output<Book>();
  readonly sendToKindle = output<Book>();

  onRowClick(book: Book): void {
    this.rowClick.emit(book);
  }

  onSendToKindle(event: Event, book: Book): void {
    event.stopPropagation();
    this.sendToKindle.emit(book);
  }

  // Helper methods to extract names from Author/Category objects
  getAuthorNames(book: Book): string {
    return book.authors.map((a) => a.name).join(', ');
  }

  getCategoryNames(book: Book): string[] {
    return book.categories.map((c) => c.name);
  }
}
