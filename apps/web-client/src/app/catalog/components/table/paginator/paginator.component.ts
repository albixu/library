import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  imports: [FormsModule],
  template: `
    <nav class="paginator" aria-label="Pagination">
      <div class="paginator-page-size">
        <span class="paginator-label">Items per page:</span>
        <select
          class="select-base paginator-select-width"
          [ngModel]="pageSize()"
          [disabled]="loading()"
          (ngModelChange)="onPageSizeChange($event)"
          aria-label="Select items per page"
        >
          @for (option of pageSizeOptions(); track option) {
            <option [value]="option">{{ option }}</option>
          }
        </select>
      </div>

      <div class="paginator-range">
        {{ rangeLabel() }}
      </div>

      <div class="paginator-controls">
        @if (loading()) {
          <div class="spinner" role="status" aria-label="Loading more items"></div>
        } @else if (hasNextPage()) {
          <button
            class="btn-secondary"
            type="button"
            data-testid="load-more-button"
            aria-label="Load more items"
            (click)="onLoadMore()"
          >
            <span class="material-symbols-outlined">expand_more</span>
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
      gap: 1.5rem;
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      background-color: rgba(30, 41, 59, 0.5);
      border-top: 1px solid var(--slate-700);
    }

    .paginator-page-size {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .paginator-label {
      white-space: nowrap;
      color: var(--slate-300);
      font-weight: 500;
    }

    .paginator-select-width {
      width: 5rem;
      background-color: var(--slate-900) !important;
      border: 1px solid var(--slate-800) !important;
      color: var(--slate-200) !important;
      padding: 0.5rem 2rem 0.5rem 0.75rem !important;
      font-size: 0.875rem;
      border-radius: 0.5rem;
    }

    .paginator-select-width:focus {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .paginator-range {
      white-space: nowrap;
      color: var(--slate-300);
      font-weight: 500;
    }

    .paginator-controls {
      display: flex;
      align-items: center;
      min-width: 120px;
      justify-content: center;
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
