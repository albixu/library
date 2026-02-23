import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CategoryChipsComponent } from '../../data-display/category-chips/category-chips.component.js';
import { LevelBadgeComponent } from '../../data-display/level-badge/level-badge.component.js';
import { FormatIconComponent } from '../../data-display/format-icon/format-icon.component.js';
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
    FormatIconComponent,
    LanguageFlagComponent,
    TruncatedTextComponent,
    EmptyStateComponent,
    LoadingOverlayComponent,
  ],
  template: `
    <div class="book-table-container">
      <app-loading-overlay [visible]="loading()" message="Loading books..." />

      @if (books().length > 0) {
        <table mat-table [dataSource]="books()" aria-label="Books" class="book-table">
          <!-- Title Column -->
          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>Title</th>
            <td mat-cell *matCellDef="let book">
              <div class="title-cell">
                <span class="book-title">{{ book.title }}</span>
                @if (book.description) {
                  <app-truncated-text
                    [text]="book.description"
                    [maxLines]="1"
                    class="book-description" />
                }
              </div>
            </td>
          </ng-container>

          <!-- Authors Column -->
          <ng-container matColumnDef="authors">
            <th mat-header-cell *matHeaderCellDef>Authors</th>
            <td mat-cell *matCellDef="let book">
              {{ getAuthorNames(book) }}
            </td>
          </ng-container>

          <!-- Categories Column -->
          <ng-container matColumnDef="categories">
            <th mat-header-cell *matHeaderCellDef>Categories</th>
            <td mat-cell *matCellDef="let book">
              <app-category-chips [categories]="getCategoryNames(book)" [maxVisible]="2" />
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
              <app-format-icon [format]="book.format" [size]="'medium'" />
            </td>
          </ng-container>

          <!-- Language Column -->
          <ng-container matColumnDef="language">
            <th mat-header-cell *matHeaderCellDef>Language</th>
            <td mat-cell *matCellDef="let book">
              <app-language-flag [languageCode]="book.language" />
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let book">
              <button
                mat-icon-button
                aria-label="Send to Kindle"
                (click)="onSendToKindle($event, book)">
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
            (keydown.enter)="onRowClick(row)">
          </tr>
        </table>
      } @else if (!loading()) {
        <app-empty-state [type]="emptyStateType()" />
      }
    </div>
  `,
  styles: `
    .book-table-container {
      position: relative;
      min-height: 200px;
    }

    .book-table {
      width: 100%;
    }

    .book-row {
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: var(--mat-sys-surface-container);
      }

      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
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
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .book-description {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant);
    }

    th.mat-mdc-header-cell {
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
    }

    td.mat-column-actions {
      width: 48px;
      text-align: center;
    }

    td.mat-column-format,
    td.mat-column-language {
      width: 80px;
      text-align: center;
    }

    td.mat-column-level {
      width: 120px;
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
    'title',
    'authors',
    'categories',
    'level',
    'format',
    'language',
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
