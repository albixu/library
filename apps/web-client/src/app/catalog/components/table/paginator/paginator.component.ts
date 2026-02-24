import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
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
  imports: [NgSelectModule, FormsModule],
  template: `
    <nav class="paginator" aria-label="Pagination">
      <div class="paginator-page-size">
        <span class="paginator-label">Items per page:</span>
        <ng-select
          class="paginator-select"
          [items]="pageSizeOptions()"
          [ngModel]="pageSize()"
          [disabled]="loading()"
          [searchable]="false"
          [clearable]="false"
          (ngModelChange)="onPageSizeChange($event)"
          aria-label="Select items per page"
        >
        </ng-select>
      </div>

      <div class="paginator-range">
        {{ rangeLabel() }}
      </div>

      <div class="paginator-controls">
        @if (loading()) {
          <div class="spinner" role="status" aria-label="Loading more items">
            <svg class="spinner-icon" viewBox="0 0 24 24">
              <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke-width="3"></circle>
            </svg>
          </div>
        } @else if (hasNextPage()) {
          <button
            class="load-more-button"
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
      gap: 1rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      color: #94A3B8; /* slate-400 */
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

    .load-more-button {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #17a1cf; /* primary color */
      background-color: transparent;
      border: 1px solid #17a1cf;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background-color: rgba(23, 161, 207, 0.1);
      }

      &:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .material-symbols-outlined {
        font-size: 1.25rem;
      }
    }

    .spinner {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner-icon {
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
    }

    .spinner-circle {
      stroke: #17a1cf; /* primary color */
      stroke-linecap: round;
      stroke-dasharray: 50, 200;
      stroke-dashoffset: 0;
      animation: dash 1.5s ease-in-out infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes dash {
      0% {
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray: 100, 200;
        stroke-dashoffset: -15;
      }
      100% {
        stroke-dasharray: 100, 200;
        stroke-dashoffset: -125;
      }
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
