import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService, QueryParams } from './api.service.js';
import {
  BookSearchResponse,
  BookTypeListResponse,
  CategoryListResponse,
  BookLevelListResponse,
  SearchFilters,
  PaginationParams,
} from '../models/index.js';

/**
 * Default pagination limit
 */
const DEFAULT_LIMIT = 50;

/**
 * BookService - Service for book-related API operations
 *
 * Provides methods for:
 * - Searching books with filters and pagination
 * - Fetching book types
 * - Fetching categories (optionally filtered by type)
 * - Fetching levels (optionally filtered by type)
 */
@Injectable({
  providedIn: 'root',
})
export class BookService {
  private readonly api = inject(ApiService);

  /**
   * Search books with optional filters and pagination
   *
   * @param filters - Optional search filters
   * @param pagination - Optional pagination params (limit, cursor)
   * @returns Observable of BookSearchResponse
   */
  searchBooks(
    filters: SearchFilters = {},
    pagination: PaginationParams = {}
  ): Observable<BookSearchResponse> {
    const params = this.buildSearchParams(filters, pagination);
    return this.api.get<BookSearchResponse>('/books', params);
  }

  /**
   * Send a book to the specified email address
   *
   * @param bookId - The ID of the book to send
   * @param email - The destination email address
   * @returns Observable<void>
   */
  sendBookByEmail(bookId: string, email: string): Observable<void> {
    return this.api.post<void>(`/books/${bookId}/send`, { email });
  }

  /**
   * Get all book types
   *
   * @returns Observable of BookTypeListResponse
   */
  getBookTypes(): Observable<BookTypeListResponse> {
    return this.api.get<BookTypeListResponse>('/book-types');
  }

  /**
   * Get categories, optionally filtered by book type
   *
   * @param type - Optional type name to filter by
   * @returns Observable of CategoryListResponse
   */
  getCategories(type?: string): Observable<CategoryListResponse> {
    const params = type ? { type } : undefined;
    return this.api.get<CategoryListResponse>('/book-categories', params);
  }

  /**
   * Get book levels, optionally filtered by book type
   *
   * @param type - Optional type name to filter by
   * @returns Observable of BookLevelListResponse
   */
  getLevels(type?: string): Observable<BookLevelListResponse> {
    const params = type ? { type } : undefined;
    return this.api.get<BookLevelListResponse>('/book-levels', params);
  }

  /**
   * Build query params for book search
   */
  private buildSearchParams(filters: SearchFilters, pagination: PaginationParams): QueryParams {
    const params: QueryParams = {
      limit: pagination.limit ?? DEFAULT_LIMIT,
      cursor: pagination.cursor,
    };

    // Add text filters (only if non-empty)
    if (filters.isbn) {
      params['isbn'] = filters.isbn;
    }
    if (filters.title) {
      params['title'] = filters.title;
    }
    if (filters.author) {
      params['author'] = filters.author;
    }
    if (filters.text) {
      params['text'] = filters.text;
    }

    // Add type filter (API uses 'types' param)
    if (filters.type) {
      params['types'] = filters.type;
    }

    // Add array filters (only if non-empty arrays)
    if (filters.categories && filters.categories.length > 0) {
      params['categories'] = filters.categories;
    }
    if (filters.levels && filters.levels.length > 0) {
      params['levels'] = filters.levels;
    }

    return params;
  }
}
