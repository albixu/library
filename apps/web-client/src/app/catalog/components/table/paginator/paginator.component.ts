import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface PageEvent {
  pageIndex: number;
  previousPageIndex: number;
  pageSize: number;
  length: number;
}

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule],
  template: `
    <nav class="paginator" aria-label="Pagination">
      <div class="paginator-page-size">
        <span class="paginator-label">Items per page:</span>
        <mat-form-field appearance="outline" class="paginator-select">
          <mat-select
            [value]="pageSize()"
            [disabled]="disabled()"
            (selectionChange)="onPageSizeChange($event.value)">
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
        <button
          mat-icon-button
          aria-label="First page"
          [disabled]="isFirstPage() || disabled()"
          (click)="goToFirstPage()">
          <mat-icon>first_page</mat-icon>
        </button>
        <button
          mat-icon-button
          aria-label="Previous page"
          [disabled]="isFirstPage() || disabled()"
          (click)="goToPreviousPage()">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button
          mat-icon-button
          aria-label="Next page"
          [disabled]="isLastPage() || disabled()"
          (click)="goToNextPage()">
          <mat-icon>chevron_right</mat-icon>
        </button>
        <button
          mat-icon-button
          aria-label="Last page"
          [disabled]="isLastPage() || disabled()"
          (click)="goToLastPage()">
          <mat-icon>last_page</mat-icon>
        </button>
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
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
  readonly pageIndex = input<number>(0);
  readonly pageSize = input<number>(25);
  readonly totalItems = input<number>(0);
  readonly pageSizeOptions = input<number[]>([25, 50, 100]);
  readonly disabled = input<boolean>(false);

  readonly page = output<PageEvent>();

  readonly totalPages = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    return Math.ceil(total / size) || 1;
  });

  readonly isFirstPage = computed(() => this.pageIndex() === 0);
  readonly isLastPage = computed(
    () => this.pageIndex() >= this.totalPages() - 1
  );

  readonly rangeLabel = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return '0 of 0';
    }
    const start = this.pageIndex() * this.pageSize() + 1;
    const end = Math.min((this.pageIndex() + 1) * this.pageSize(), total);
    return `${start} – ${end} of ${total}`;
  });

  onPageSizeChange(newSize: number): void {
    this.emitPageEvent(0, newSize);
  }

  goToFirstPage(): void {
    this.emitPageEvent(0);
  }

  goToPreviousPage(): void {
    this.emitPageEvent(this.pageIndex() - 1);
  }

  goToNextPage(): void {
    this.emitPageEvent(this.pageIndex() + 1);
  }

  goToLastPage(): void {
    this.emitPageEvent(this.totalPages() - 1);
  }

  private emitPageEvent(
    newPageIndex: number,
    newPageSize: number = this.pageSize()
  ): void {
    this.page.emit({
      pageIndex: newPageIndex,
      previousPageIndex: this.pageIndex(),
      pageSize: newPageSize,
      length: this.totalItems(),
    });
  }
}
