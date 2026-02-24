import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatTableModule,
    MatButtonModule,
    MatIconModule,
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
            <table mat-table [dataSource]="books()" aria-label="Books" class="book-table">
              <!-- ISBN Column -->
              <ng-container matColumnDef="isbn">
                <th mat-header-cell *matHeaderCellDef>ISBN</th>
                <td mat-cell *matCellDef="let book">
                  <span class="isbn-text">{{ book.isbn || '-' }}</span>
                </td>
              </ng-container>

              <!-- Title Column -->
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Book Details</th>
                <td mat-cell *matCellDef="let book">
                  <div class="title-cell">
                    <span class="book-title">{{ book.title }}</span>
                    <span class="book-author">{{ getAuthorNames(book) }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Type/Category Column -->
              <ng-container matColumnDef="typeCategory">
                <th mat-header-cell *matHeaderCellDef>Type / Category</th>
                <td mat-cell *matCellDef="let book">
                  <div class="type-category-cell">
                    <span class="book-type">{{ book.type?.name || 'Unknown' }}</span>
                    <app-category-chips [categories]="getCategoryNames(book)" [maxVisible]="1" />
                  </div>
                </td>
              </ng-container>

              <!-- Language Column -->
              <ng-container matColumnDef="language">
                <th mat-header-cell *matHeaderCellDef class="text-center">Lang</th>
                <td mat-cell *matCellDef="let book" class="text-center">
                  <app-language-flag [languageCode]="book.language" />
                </td>
              </ng-container>

              <!-- Level Column -->
              <ng-container matColumnDef="level">
                <th mat-header-cell *matHeaderCellDef>Level</th>
                <td mat-cell *matCellDef="let book">
                  <app-level-badge [level]="book.level" />
                </td>
              </ng-container>

              <!-- Format Column -->
              <ng-container matColumnDef="format">
                <th mat-header-cell *matHeaderCellDef>Format</th>
                <td mat-cell *matCellDef="let book">
                  <span class="format-text">{{ book.format || '-' }}</span>
                </td>
              </ng-container>

              <!-- Description Column -->
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let book">
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
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="text-right">Actions</th>
                <td mat-cell *matCellDef="let book" class="text-right">
                  <button
                    mat-icon-button
                    class="action-button"
                    aria-label="Send to Kindle"
                    (click)="onSendToKindle($event, book)"
                  >
                    <mat-icon>send_to_mobile</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                class="book-row"
                tabindex="0"
                (click)="onRowClick(row)"
                (keydown.enter)="onRowClick(row)"
              ></tr>
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
      background-color: rgb(255 255 255); /* white in light mode */
      border-radius: 0.75rem; /* rounded-xl */
      border: 1px solid rgb(226 232 240); /* slate-200 */
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* shadow-sm */
      overflow: hidden;
    }

    :host-context(.dark) .book-table-container {
      background-color: rgb(15 23 42); /* slate-900 in dark mode */
      border-color: rgb(30 41 59); /* slate-800 */
    }

    .table-scroll {
      overflow-x: auto;
    }

    .book-table {
      width: 100%;
      border-collapse: collapse;
    }

    // Row border separator
    .book-table tbody tr {
      border-bottom: 1px solid rgb(241 245 249); /* slate-100 in light mode */
    }

    :host-context(.dark) .book-table tbody tr {
      border-bottom-color: rgb(30 41 59); /* slate-800 in dark mode */
    }

    .book-table tbody tr:last-child {
      border-bottom: none;
    }

    .book-row {
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: rgb(248 250 252); /* slate-50 in light mode */
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }

    :host-context(.dark) .book-row:hover {
      background-color: rgb(30 41 59 / 0.4); /* slate-800/40 in dark mode */
    }

    .title-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      padding: 0.5rem 0;
    }

    .book-title {
      font-weight: 600; /* font-semibold */
      color: var(--color-text-primary);
      font-size: 0.875rem; /* text-sm - mismo tamaño que en Stitch */
    }

    .book-author {
      font-size: 0.75rem; /* text-xs */
      color: rgb(100 116 139); /* slate-500 */
    }

    .type-category-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .book-type {
      font-size: 0.75rem; /* text-xs */
      font-weight: 500; /* font-medium */
      color: rgb(51 65 85); /* slate-700 in light, slate-300 in dark */
    }

    :host-context(.dark) .book-type {
      color: rgb(203 213 225); /* slate-300 */
    }

    .format-text {
      font-size: 0.75rem; /* text-xs */
      color: rgb(71 85 105); /* slate-600 in light, slate-400 in dark */
    }

    :host-context(.dark) .format-text {
      color: rgb(148 163 184); /* slate-400 */
    }

    .isbn-text {
      font-size: 0.75rem; /* text-xs */
      font-family: 'Courier New', Courier, monospace; /* font-mono */
      color: rgb(148 163 184); /* slate-400 */
    }

    .description-text {
      font-size: 0.75rem; /* text-xs */
      color: rgb(100 116 139); /* slate-500 - más apagado que antes */
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .action-button {
      color: rgb(100 116 139); /* slate-500 */
      transition: color 0.15s ease;

      &:hover {
        color: #17a1cf; /* primary/cyan color */
      }
    }

    // Header cells styling
    th.mat-mdc-header-cell {
      padding: 1rem 1.5rem; /* px-6 py-4 */
      font-size: 0.75rem; /* text-xs */
      font-weight: 600; /* font-semibold */
      text-transform: uppercase;
      letter-spacing: 0.05em; /* tracking-wider */
      color: rgb(100 116 139); /* slate-500 */
      background-color: rgb(248 250 252); /* slate-50 in light mode */
      border-bottom: 1px solid rgb(226 232 240); /* slate-200 */
    }

    :host-context(.dark) th.mat-mdc-header-cell {
      background-color: rgb(30 41 59 / 0.5); /* slate-800/50 in dark mode */
      border-bottom-color: rgb(51 65 85); /* slate-700 */
    }

    // Body cells styling
    td.mat-mdc-cell {
      padding: 1rem 1.5rem; /* px-6 py-4 - matching Stitch exactly */
      vertical-align: middle;
    }

    td.mat-column-actions {
      width: 80px;
    }

    td.mat-column-isbn {
      width: 140px;
    }

    td.mat-column-language {
      width: 80px;
    }

    td.mat-column-level {
      width: 140px;
    }

    td.mat-column-format {
      width: 100px;
    }

    td.mat-column-description {
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

  readonly displayedColumns = [
    'isbn',
    'title',
    'typeCategory',
    'language',
    'level',
    'format',
    'description',
    'actions',
  ];

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
