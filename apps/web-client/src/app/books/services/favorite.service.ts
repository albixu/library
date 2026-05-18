import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/services/api.service.js';

/**
 * Response from the favorite toggle endpoint
 */
export interface FavoriteToggleResponse {
  favorite: boolean;
}

/**
 * API envelope wrapper used by all API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

/**
 * FavoriteService - Handles book favorite toggle operations
 *
 * Calls POST /api/books/:id/favorite to toggle the favorite state.
 * Auth is handled automatically via HttpOnly cookie sent by the browser.
 */
@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private readonly api = inject(ApiService);

  /**
   * Toggle the favorite state for a book
   *
   * @param bookId - The ID of the book to toggle
   * @returns Observable of FavoriteToggleResponse with updated favorite state
   */
  toggle(bookId: string): Observable<ApiResponse<FavoriteToggleResponse>> {
    return this.api.post<ApiResponse<FavoriteToggleResponse>>(`/books/${bookId}/favorite`, {});
  }
}
