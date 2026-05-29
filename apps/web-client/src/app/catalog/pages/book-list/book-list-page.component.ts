import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import {
  Book,
  BookType,
  CategoryListItem,
  BookLevel,
  SearchFilters,
  SelectOption,
} from '../../../core/models/index.js';
import { FilterPanelComponent } from '../../components/filters/index.js';
import { BookCardGridComponent } from '../../components/cards/book-card-grid/index.js';
import { BookCardSkeletonComponent } from '../../components/cards/book-card-skeleton/index.js';
import { PaginatorComponent } from '../../components/table/paginator/index.js';
import { SendToKindleDialogComponent } from '../../components/dialogs/index.js';
import { BookSearchStore } from '../../../core/services/book-search.store.js';
import { DialogService } from '../../../core/services/dialog.service.js';
import { AuthService } from '../../../auth/auth.service.js';

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
    FilterPanelComponent,
    BookCardGridComponent,
    BookCardSkeletonComponent,
    PaginatorComponent,
  ],
  template: `
    <div class="book-list-container">
      <!-- Mobile Backdrop -->
      @if (isMobile() && isMobileDrawerOpen()) {
        <div
          class="backdrop"
          role="button"
          tabindex="0"
          aria-label="Cerrar filtros"
          (click)="toggleMobileDrawer()"
          (keydown.escape)="toggleMobileDrawer()"
          (keydown.enter)="toggleMobileDrawer()"
          (keydown.space)="toggleMobileDrawer(); $event.preventDefault()"
        ></div>
      }

      <!-- Filter Sidebar / Drawer -->
      <aside
        data-testid="filter-sidenav"
        [class.open]="isMobile() ? isMobileDrawerOpen() : true"
        [class.mobile]="isMobile()"
        role="complementary"
        aria-label="Filtros de libros"
        class="filter-sidenav"
      >
        <app-filter-panel
          [types]="typeOptions()"
          [categories]="categoryOptions()"
          [levels]="levelOptions()"
          [typesLoading]="store.typesLoading()"
          [categoriesLoading]="store.categoriesLoading()"
          [levelsLoading]="store.levelsLoading()"
          [isAuthenticated]="isAuthenticated()"
          (filtersChange)="onFiltersChange($event)"
          (typeChange)="onTypeChange($event)"
        />
      </aside>

      <!-- Main Content -->
      <main role="main" class="main-content">
        <!-- Mobile Header -->
        @if (isMobile()) {
          <div class="mobile-toolbar">
            <button
              type="button"
              data-testid="mobile-filter-toggle"
              aria-label="Alternar filtros"
              class="filter-toggle-btn"
              (click)="toggleMobileDrawer()"
            >
              <span class="material-symbols-outlined" aria-hidden="true">filter_list</span>
            </button>
            <span class="mobile-title">Catálogo de Libros</span>
            @if (store.hasFilters()) {
              <span class="filter-badge">{{ activeFilterCount() }}</span>
            }
          </div>
        }

        <div class="content-wrapper">
          <!-- Error state -->
          @if (store.error()) {
            <div class="error-state" role="alert">
              <span class="material-symbols-outlined error-icon" aria-hidden="true">
                error_outline
              </span>
              <h2 class="error-title">No se pueden cargar los libros</h2>
              <p class="error-message">{{ store.error() }}</p>
              <button type="button" class="btn btn-primary" (click)="onRetrySearch()">
                <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
                Reintentar
              </button>
            </div>
          } @else {
            <!-- Results info -->
            <div class="results-header">
              <div>
                <h2 class="results-title">Colección de Libros</h2>
                <p class="results-subtitle">
                  @if (store.loading()) {
                    Cargando libros...
                  } @else if (store.isEmpty()) {
                    No se encontraron libros
                  } @else {
                    Gestiona y explora tu catálogo de biblioteca digital
                  }
                </p>
              </div>
            </div>

            <!-- Book display -->
            @if (isMobile()) {
              <!-- Mobile: always cards grid -->
              @if (store.loading() && store.books().length === 0) {
                <app-book-card-skeleton />
              } @else {
                <app-book-card-grid
                  [books]="store.books()"
                  (bookSelect)="onBookSelect($event)"
                  (sendToKindle)="onSendToKindle($event)"
                  (favoriteToggle)="onFavoriteToggle($event)"
                />
              }
              @if (!store.isEmpty()) {
                <app-paginator
                  [totalCount]="store.pagination().totalCount"
                  [currentCount]="store.books().length"
                  [hasNextPage]="store.pagination().hasNextPage"
                  [loading]="store.loading()"
                  (loadMore)="onLoadMore()"
                />
              }
            } @else {
              <!-- Desktop: Cards grid -->
              @if (store.loading() && store.books().length === 0) {
                <app-book-card-skeleton />
              } @else {
                <app-book-card-grid
                  [books]="store.books()"
                  (bookSelect)="onBookSelect($event)"
                  (sendToKindle)="onSendToKindle($event)"
                  (favoriteToggle)="onFavoriteToggle($event)"
                />
              }
              @if (!store.isEmpty()) {
                <div class="paginator-wrapper">
                  <app-paginator
                    [totalCount]="store.pagination().totalCount"
                    [currentCount]="store.books().length"
                    [hasNextPage]="store.pagination().hasNextPage"
                    [loading]="store.loading()"
                    (loadMore)="onLoadMore()"
                  />
                </div>
              }
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .book-list-container {
      display: flex;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    /* Backdrop for mobile */
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      backdrop-filter: blur(2px);
      animation: fadeIn 0.3s ease;
      background-color: rgba(15, 23, 42, 0.7); /* slate-900 */
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Filter Sidebar */
    .filter-sidenav {
      width: 320px;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      flex-shrink: 0;
      transition: transform 0.3s ease;
      background-color: #111d21 !important; /* background-dark from Stitch design */
      border-right: 1px solid rgb(51 65 85); /* slate-700 */

      /* Mobile: drawer */
      &.mobile {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 50;
        transform: translateX(-100%);
        max-width: 320px;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);

        &.open {
          transform: translateX(0);
        }
      }
    }

    /* Main Content */
    .main-content {
      flex: 1;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background-color: rgb(15 23 42); /* slate-900 */
    }

    /* Mobile Toolbar */
    .mobile-toolbar {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: rgb(30 41 59); /* slate-800 */
      border-bottom: 1px solid rgb(51 65 85); /* slate-700 */
    }

    .filter-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border: none;
      border-radius: 0.5rem;
      background: transparent;
      cursor: pointer;
      transition: background-color 0.2s ease;
      color: rgb(203 213 225); /* slate-300 */

      .material-symbols-outlined {
        font-size: 1.5rem;
      }

      &:hover {
        background-color: rgb(51 65 85); /* slate-700 */
      }
    }

    .mobile-title {
      flex: 1;
      font-weight: 500;
      margin-left: 0.5rem;
      color: rgb(241 245 249); /* slate-100 */
    }

    .filter-badge {
      background-color: #17a1cf;
      color: white;
      border-radius: 0.75rem;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      margin-left: 0.5rem;
    }

    /* Content Wrapper */
    .content-wrapper {
      flex: 1;
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      overflow-y: auto;
    }

    /* Results Header */
    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .results-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
      color: rgb(241 245 249); /* slate-100 */
    }

    .results-subtitle {
      font-size: 0.875rem;
      margin: 0.25rem 0 0;
      color: rgb(148 163 184); /* slate-400 */
    }

    /* Paginator */
    .paginator-wrapper {
      border-top: 1px solid rgb(51 65 85); /* slate-700 */
      background-color: rgb(15 23 42); /* slate-900 */
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem 1.5rem;
      text-align: center;
    }

    .error-icon {
      font-size: 3rem;
      color: #ef4444; /* red-500 */
    }

    .error-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: rgb(241 245 249); /* slate-100 */
    }

    .error-message {
      margin: 0;
      font-size: 0.875rem;
      max-width: 400px;
      color: rgb(148 163 184); /* slate-400 */
    }

    /* Button Styles */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;

      .material-symbols-outlined {
        font-size: 1.125rem;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background-color: #17a1cf;
      color: white;

      &:hover:not(:disabled) {
        background-color: #1389b3;
      }

      &:focus-visible {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
      }
    }

    .btn-secondary {
      background-color: transparent;
      border: 1px solid rgb(51 65 85); /* slate-700 */
      color: rgb(203 213 225); /* slate-300 */

      &:hover:not(:disabled) {
        background-color: rgb(51 65 85); /* slate-700 */
      }

      &:focus-visible {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
      }
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .content-wrapper {
        padding: 1rem;
      }

      .results-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookListPageComponent implements OnInit {
  readonly store = inject(BookSearchStore);
  private readonly dialogService = inject(DialogService);
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** True when a user is logged in */
  readonly isAuthenticated = computed(() => this.authService.currentUser() !== null);

  // Mobile state
  readonly isMobileDrawerOpen = signal(false);

  // Responsive breakpoint
  readonly isMobile = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((result) => result.matches)),
    { initialValue: false }
  );

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
    if (filters.favorites) count++;

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

  onBookSelect(_book: Book): void {
    // Reserved for future detail view navigation
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

  onSendToKindle(book: Book): void {
    this.dialogService.open(SendToKindleDialogComponent, {
      data: book,
      width: '400px',
      maxWidth: '90vw',
    });
  }

  onRetrySearch(): void {
    this.store.searchBooks();
  }

  onFavoriteToggle(_event: { book: Book; favorite: boolean }): void {
    this.store.searchBooks();
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen.update((open) => !open);
  }
}
