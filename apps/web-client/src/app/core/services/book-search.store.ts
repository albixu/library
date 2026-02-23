import { Injectable, inject, signal, computed } from '@angular/core';

import { BookService } from './book.service.js';
import {
  Book,
  BookType,
  BookLevel,
  CategoryListItem,
  PaginationInfo,
  SearchFilters,
} from '../models/index.js';

/**
 * Default pagination configuration
 */
const DEFAULT_PAGINATION: PaginationInfo = {
  limit: 50,
  hasNextPage: false,
  nextCursor: null,
  totalCount: 0,
};

/**
 * BookSearchStore - Reactive state store for book search using Signals
 *
 * Manages:
 * - Book search results with pagination
 * - Search filters
 * - Loading states
 * - Book types, categories, and levels for filter dropdowns
 */
@Injectable({
  providedIn: 'root',
})
export class BookSearchStore {
  private readonly bookService = inject(BookService);

  // ==========================================================================
  // State Signals
  // ==========================================================================

  // Book search state
  private readonly _books = signal<Book[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _pagination = signal<PaginationInfo>({ ...DEFAULT_PAGINATION });
  private readonly _filters = signal<SearchFilters>({});

  // Filter options state
  private readonly _types = signal<BookType[]>([]);
  private readonly _categories = signal<CategoryListItem[]>([]);
  private readonly _levels = signal<BookLevel[]>([]);

  // Loading states for filter options
  private readonly _typesLoading = signal<boolean>(false);
  private readonly _categoriesLoading = signal<boolean>(false);
  private readonly _levelsLoading = signal<boolean>(false);

  // ==========================================================================
  // Public Readonly Signals
  // ==========================================================================

  readonly books = this._books.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly filters = this._filters.asReadonly();

  readonly types = this._types.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly levels = this._levels.asReadonly();

  readonly typesLoading = this._typesLoading.asReadonly();
  readonly categoriesLoading = this._categoriesLoading.asReadonly();
  readonly levelsLoading = this._levelsLoading.asReadonly();

  // ==========================================================================
  // Computed Signals
  // ==========================================================================

  /**
   * Returns true if there are no books
   */
  readonly isEmpty = computed(() => this._books().length === 0);

  /**
   * Returns true if any filter has a non-empty value
   */
  readonly hasFilters = computed(() => {
    const filters = this._filters();
    return Object.entries(filters).some(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== '';
    });
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Search books with current filters
   * Replaces current results (use loadNextPage for pagination)
   */
  searchBooks(): void {
    this._loading.set(true);
    this._error.set(null);

    const filters = this._filters();
    const pagination = { limit: this._pagination().limit };

    this.bookService.searchBooks(filters, pagination).subscribe({
      next: (response) => {
        this._loading.set(false);

        if (response.success && response.data) {
          this._books.set(response.data.items);
          this._pagination.set(response.data.pagination);
        } else {
          this._error.set(response.error?.message ?? 'Unknown error');
          this._books.set([]);
        }
      },
      error: (err: Error) => {
        this._loading.set(false);
        this._error.set(err.message);
      },
    });
  }

  /**
   * Load next page of results
   * Appends to current results
   */
  loadNextPage(): void {
    const currentPagination = this._pagination();

    if (!currentPagination.hasNextPage || !currentPagination.nextCursor) {
      return;
    }

    this._loading.set(true);

    const filters = this._filters();
    const pagination = {
      limit: currentPagination.limit,
      cursor: currentPagination.nextCursor,
    };

    this.bookService.searchBooks(filters, pagination).subscribe({
      next: (response) => {
        this._loading.set(false);

        if (response.success && response.data) {
          // Append new books to existing ones
          this._books.update((books) => [...books, ...response.data!.items]);
          this._pagination.set(response.data.pagination);
        } else {
          this._error.set(response.error?.message ?? 'Unknown error');
        }
      },
      error: (err: Error) => {
        this._loading.set(false);
        this._error.set(err.message);
      },
    });
  }

  /**
   * Update search filters
   * Resets pagination cursor
   */
  setFilters(filters: SearchFilters): void {
    this._filters.set(filters);
    // Reset cursor when filters change
    this._pagination.update((p) => ({ ...p, nextCursor: null }));
  }

  /**
   * Change page size and trigger new search
   */
  setPageSize(limit: number): void {
    this._pagination.update((p) => ({ ...p, limit }));
    this.searchBooks();
  }

  /**
   * Load book types for filter dropdown
   */
  loadTypes(): void {
    this._typesLoading.set(true);

    this.bookService.getBookTypes().subscribe({
      next: (response) => {
        this._typesLoading.set(false);

        if (response.success && response.data) {
          this._types.set(response.data);
        }
      },
      error: () => {
        this._typesLoading.set(false);
      },
    });
  }

  /**
   * Load categories for filter dropdown
   * @param type - Book type to filter by (empty string clears categories)
   */
  loadCategories(type: string): void {
    if (!type) {
      this._categories.set([]);
      return;
    }

    this._categoriesLoading.set(true);

    this.bookService.getCategories(type).subscribe({
      next: (response) => {
        this._categoriesLoading.set(false);

        if (response.success && response.data) {
          this._categories.set(response.data);
        }
      },
      error: () => {
        this._categoriesLoading.set(false);
      },
    });
  }

  /**
   * Load levels for filter dropdown
   * @param type - Book type to filter by (empty string clears levels)
   */
  loadLevels(type: string): void {
    if (!type) {
      this._levels.set([]);
      return;
    }

    this._levelsLoading.set(true);

    this.bookService.getLevels(type).subscribe({
      next: (response) => {
        this._levelsLoading.set(false);

        if (response.success && response.data) {
          this._levels.set(response.data);
        }
      },
      error: () => {
        this._levelsLoading.set(false);
      },
    });
  }

  /**
   * Reset store to initial state
   */
  reset(): void {
    this._books.set([]);
    this._loading.set(false);
    this._error.set(null);
    this._pagination.set({ ...DEFAULT_PAGINATION });
    this._filters.set({});
  }
}
