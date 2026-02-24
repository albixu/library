import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { FilterPanelComponent } from '../../components/filters/index.js';
import { BookTableComponent } from '../../components/table/book-table/index.js';
import { BookCardComponent } from '../../components/table/book-card/index.js';
import { PaginatorComponent } from '../../components/table/paginator/index.js';
import { SendToKindleDialogComponent } from '../../components/dialogs/index.js';
import { BookSearchStore } from '../../../core/services/book-search.store.js';
import {
  Book,
  BookType,
  CategoryListItem,
  BookLevel,
  SearchFilters,
  SelectOption,
} from '../../../core/models/index.js';

/**
 * BookListPageComponent - Main page for book catalog search and listing
 *
 * Features:
 * - Responsive layout: sidebar filters on desktop, drawer on mobile
 * - Integrates FilterPanel, BookTable/BookCards, Paginator
 * - Manages state via BookSearchStore
 * - Opens SendToKindleDialog for book sending
 * - Handles loading, empty, and error states
 */
@Component({
  selector: 'app-book-list-page',
  standalone: true,
  imports: [
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    FilterPanelComponent,
    BookTableComponent,
    BookCardComponent,
    PaginatorComponent,
  ],
  template: `
    <mat-sidenav-container class="book-list-container">
      <!-- Filter Sidebar / Drawer -->
      <mat-sidenav
        #drawer
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="isMobile() ? isMobileDrawerOpen() : true"
        [fixedInViewport]="isMobile()"
        fixedTopGap="0"
        role="complementary"
        aria-label="Book filters"
        class="filter-sidenav"
      >
        <app-filter-panel
          [types]="typeOptions()"
          [categories]="categoryOptions()"
          [levels]="levelOptions()"
          [typesLoading]="store.typesLoading()"
          [categoriesLoading]="store.categoriesLoading()"
          [levelsLoading]="store.levelsLoading()"
          (filtersChange)="onFiltersChange($event)"
          (typeChange)="onTypeChange($event)"
        />
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content role="main" class="main-content">
        <!-- Mobile Header -->
        @if (isMobile()) {
          <mat-toolbar class="mobile-toolbar">
            <button
              mat-icon-button
              data-testid="mobile-filter-toggle"
              aria-label="Toggle filters"
              (click)="toggleMobileDrawer()"
            >
              <mat-icon>filter_list</mat-icon>
            </button>
            <span class="mobile-title">Book Catalog</span>
            @if (store.hasFilters()) {
              <span class="filter-badge">{{ activeFilterCount() }}</span>
            }
          </mat-toolbar>
        }

        <div class="content-wrapper">
          <!-- Error state -->
          @if (store.error()) {
            <div class="error-state" role="alert">
              <mat-icon class="error-icon">error_outline</mat-icon>
              <h2 class="error-title">Unable to load books</h2>
              <p class="error-message">{{ store.error() }}</p>
              <button mat-raised-button color="primary" (click)="onRetrySearch()">
                <mat-icon>refresh</mat-icon>
                Retry
              </button>
            </div>
          } @else {
            <!-- Results info -->
            <div class="results-header">
              <div>
                <h2 class="results-title">Books Collection</h2>
                <p class="results-subtitle">
                  @if (store.loading()) {
                    Loading books...
                  } @else if (store.isEmpty()) {
                    No books found
                  } @else {
                    Manage and explore your digital library catalog
                  }
                </p>
              </div>
              <div class="results-actions">
                <button mat-stroked-button>
                  <mat-icon>download</mat-icon>
                  Export
                </button>
                <button mat-raised-button color="primary">
                  <mat-icon>add</mat-icon>
                  Add New Book
                </button>
              </div>
            </div>

            <!-- Book display -->
            @if (isMobile()) {
              <!-- Mobile: Cards view -->
              <div class="cards-container" role="list">
                @for (book of store.books(); track book.id) {
                  <app-book-card [book]="book" (sendToKindle)="onSendToKindle($event)" />
                }
              </div>
              @if (!store.isEmpty()) {
                <app-paginator
                  [totalCount]="store.pagination().totalCount"
                  [currentCount]="store.books().length"
                  [hasNextPage]="store.pagination().hasNextPage"
                  [pageSize]="store.pagination().limit"
                  [loading]="store.loading()"
                  (loadMore)="onLoadMore()"
                  (pageSizeChange)="onPageSizeChange($event)"
                />
              }
            } @else {
              <!-- Desktop: Table view with paginator inside container -->
              <div class="table-with-paginator">
                <app-book-table
                  [books]="store.books()"
                  [loading]="store.loading()"
                  [emptyStateType]="emptyStateType()"
                  (sendToKindle)="onSendToKindle($event)"
                />
                @if (!store.isEmpty()) {
                  <div class="paginator-wrapper">
                    <app-paginator
                      [totalCount]="store.pagination().totalCount"
                      [currentCount]="store.books().length"
                      [hasNextPage]="store.pagination().hasNextPage"
                      [pageSize]="store.pagination().limit"
                      [loading]="store.loading()"
                      (loadMore)="onLoadMore()"
                      (pageSizeChange)="onPageSizeChange($event)"
                    />
                  </div>
                }
              </div>
            }
          }
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
      }

      .book-list-container {
        height: 100%;
        overflow: hidden;
      }

      .filter-sidenav {
        width: 280px;
        background: var(--color-bg-surface);
        border-right: 1px solid var(--color-border);
        overflow-y: auto;
      }

      .main-content {
        background: var(--color-bg-primary);
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .mobile-toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--color-bg-surface);
        border-bottom: 1px solid var(--color-border);
      }

      .mobile-title {
        flex: 1;
        font-weight: 500;
        margin-left: 8px;
      }

      .filter-badge {
        background: var(--color-accent);
        color: white;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 0.75rem;
        font-weight: 500;
        margin-left: 8px;
      }

      .content-wrapper {
        flex: 1;
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
        overflow-y: auto;
      }

      .results-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }

      .results-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;
      }

      .results-subtitle {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        margin: 4px 0 0;
      }

      .results-actions {
        display: flex;
        align-items: center;
        gap: 12px;

        button mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 6px;
        }
      }

      .cards-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }

      .table-with-paginator {
        display: flex;
        flex-direction: column;
        border-radius: var(--radius-xl);
        border: 1px solid var(--color-border);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
        background: var(--color-bg-surface);
      }

      .table-with-paginator app-book-table ::ng-deep .book-table-container {
        border-radius: 0;
        border: none;
        box-shadow: none;
      }

      .paginator-wrapper {
        border-top: 1px solid var(--color-border);
        background: var(--color-table-header-bg);
      }

      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 48px 24px;
        text-align: center;
      }

      .error-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--color-error);
      }

      .error-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
        color: var(--color-text-primary);
      }

      .error-message {
        margin: 0;
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        max-width: 400px;
      }

      /* Mobile adjustments */
      @media (max-width: 768px) {
        .filter-sidenav {
          width: 100%;
          max-width: 320px;
        }

        .content-wrapper {
          padding: 16px;
        }

        .cards-container {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookListPageComponent implements OnInit {
  readonly store = inject(BookSearchStore);
  private readonly dialog = inject(MatDialog);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // Mobile state
  readonly isMobileDrawerOpen = signal(false);

  // Responsive breakpoint
  readonly isMobile = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((result) => result.matches)),
    { initialValue: false }
  );

  // Computed signals for empty state type
  readonly emptyStateType = computed(() => {
    if (this.store.isEmpty()) {
      return this.store.hasFilters() ? 'no-results' : 'initial';
    }
    return 'empty';
  });

  // Count active filters for badge
  readonly activeFilterCount = computed(() => {
    const filters = this.store.filters();
    let count = 0;

    if (filters.isbn) count++;
    if (filters.title) count++;
    if (filters.author) count++;
    if (filters.type) count++;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.levels && filters.levels.length > 0) count++;
    if (filters.text) count++;

    return count;
  });

  // Transform store data to SelectOption format for FilterPanel
  readonly typeOptions = computed((): SelectOption[] =>
    this.store.types().map((t: BookType) => ({ id: t.id, name: t.name }))
  );

  readonly categoryOptions = computed((): SelectOption[] =>
    this.store.categories().map((c: CategoryListItem) => ({ id: c.id, name: c.name }))
  );

  readonly levelOptions = computed((): SelectOption[] =>
    this.store.levels().map((l: BookLevel) => ({ id: l.id, name: l.name }))
  );

  ngOnInit(): void {
    // Load initial data
    this.store.loadTypes();
    this.store.searchBooks();
  }

  onFiltersChange(filters: SearchFilters): void {
    this.store.setFilters(filters);
    this.store.searchBooks();

    // Close mobile drawer after applying filters
    if (this.isMobile()) {
      this.isMobileDrawerOpen.set(false);
    }
  }

  onTypeChange(type: string): void {
    this.store.loadCategories(type);
    this.store.loadLevels(type);
  }

  onLoadMore(): void {
    this.store.loadNextPage();
  }

  onPageSizeChange(pageSize: number): void {
    this.store.setPageSize(pageSize);
  }

  onSendToKindle(book: Book): void {
    this.dialog.open(SendToKindleDialogComponent, {
      data: book,
      width: '400px',
      maxWidth: '90vw',
    });
  }

  onRetrySearch(): void {
    this.store.searchBooks();
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen.update((open) => !open);
  }
}
