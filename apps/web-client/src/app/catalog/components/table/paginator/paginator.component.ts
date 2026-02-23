import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * PaginatorComponent - Cursor-based pagination with "load more" functionality
 *
 * Features:
 * - Shows current vs total count (e.g., "25 of 120")
 * - "Load more" button when more pages available
 * - Page size selector
 * - Loading state with spinner
 * - Accessible with proper ARIA labels
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <nav class="paginator" aria-label="Pagination">
      <div class="paginator-page-size">
        <span class="paginator-label">Items per page:</span>
        <mat-form-field appearance="outline" class="paginator-select">
          <mat-select
            [value]="pageSize()"
            [disabled]="loading()"
            (selectionChange)="onPageSizeChange($event.value)"
          >
            @for (option of pageSizeOptions(); track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="paginator-range">
        {{ rangeLabel() }}
      </div>

      <div class="paginator-controls">
        @if (loading()) {
          <mat-spinner diameter="24"></mat-spinner>
        } @else if (hasNextPage()) {
          <button
            mat-stroked-button
            data-testid="load-more-button"
            aria-label="Load more items"
            (click)="onLoadMore()"
          >
            <mat-icon>expand_more</mat-icon>
            Load more
          </button>
        }
      </div>
    </nav>
  `,
  styles: `
    .paginator {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .paginator-page-size {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .paginator-label {
      white-space: nowrap;
    }

    .paginator-select {
      width: 5rem;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      ::ng-deep .mat-mdc-text-field-wrapper {
        padding: 0 0.5rem;
      }

      ::ng-deep .mat-mdc-form-field-infix {
        min-height: 2rem;
        padding: 0.25rem 0;
      }
    }

    .paginator-range {
      white-space: nowrap;
    }

    .paginator-controls {
      display: flex;
      align-items: center;
      min-width: 120px;
      justify-content: center;
    }

    .paginator-controls button mat-icon {
      margin-right: 4px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
  // Cursor-based pagination inputs
  readonly totalCount = input<number>(0);
  readonly currentCount = input<number>(0);
  readonly hasNextPage = input<boolean>(false);
  readonly pageSize = input<number>(25);
  readonly pageSizeOptions = input<number[]>([25, 50, 100]);
  readonly loading = input<boolean>(false);

  // Outputs
  readonly loadMore = output<void>();
  readonly pageSizeChange = output<number>();

  // Computed
  readonly rangeLabel = computed(() => {
    const total = this.totalCount();
    const current = this.currentCount();

    if (total === 0) {
      return '0 of 0';
    }

    return `${current} of ${total}`;
  });

  onLoadMore(): void {
    this.loadMore.emit();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSizeChange.emit(newSize);
  }
}
