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
      <!-- Left side: Page size selector -->
      <div class="paginator-page-size">
        <span class="paginator-label">Items per page:</span>
        <select
          class="paginator-select"
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

      <!-- Center: Load more button -->
      <div class="paginator-controls">
        @if (loading()) {
          <div class="spinner" role="status" aria-label="Loading more items">
            <span class="spinner-icon"></span>
          </div>
        } @else if (hasNextPage()) {
          <button
            class="btn-load-more"
            type="button"
            data-testid="load-more-button"
            aria-label="Load more items"
            (click)="onLoadMore()"
          >
            <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
            Load more
          </button>
        }
      </div>

      <!-- Right side: Items count info -->
      <div class="paginator-info">
        {{ rangeLabel() }}
      </div>
    </nav>
  `,
  styles: `
    .paginator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-6);
      padding: var(--spacing-3) var(--spacing-6);
      font-size: 0.875rem;
      background-color: var(--color-table-header-bg);
      border-top: 1px solid var(--color-border);
    }

    /* Left: Page size selector */
    .paginator-page-size {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      flex-shrink: 0;
    }

    .paginator-label {
      white-space: nowrap;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .paginator-select {
      width: 5rem;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-color: var(--color-bg-input) !important;
      border: 1px solid var(--color-border) !important;
      color: var(--color-text-primary) !important;
      padding: var(--spacing-2) 2.5rem var(--spacing-2) var(--spacing-3) !important;
      font-size: 0.875rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: var(--transition-colors);
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394A3B8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1.25rem;
    }

    .paginator-select:hover:not(:disabled) {
      border-color: var(--color-accent) !important;
    }

    .paginator-select:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
      border-color: var(--color-accent) !important;
    }

    .paginator-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Center: Load more button */
    .paginator-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }

    .btn-load-more {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-2);
      padding: var(--spacing-2) var(--spacing-4);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary);
      background-color: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: var(--transition-colors), var(--transition-transform);
      white-space: nowrap;
    }

    .btn-load-more:hover {
      background-color: var(--color-bg-elevated);
      border-color: var(--color-accent);
      color: var(--color-text-primary);
    }

    .btn-load-more:active {
      transform: translateY(1px);
    }

    .btn-load-more:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .btn-load-more .material-symbols-outlined {
      font-size: 1.25rem;
    }

    /* Spinner */
    .spinner {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner-icon {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Right: Items count info */
    .paginator-info {
      white-space: nowrap;
      color: var(--color-text-secondary);
      font-weight: 500;
      flex-shrink: 0;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .paginator {
        flex-direction: column;
        gap: var(--spacing-4);
        padding: var(--spacing-4);
      }

      .paginator-page-size,
      .paginator-info {
        width: 100%;
        justify-content: space-between;
      }

      .paginator-controls {
        width: 100%;
      }

      .btn-load-more {
        width: 100%;
        justify-content: center;
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
      return 'Showing 0 of 0 items';
    }

    return `Showing ${current} of ${total} items`;
  });

  onLoadMore(): void {
    this.loadMore.emit();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSizeChange.emit(newSize);
  }
}
