import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/services/api.service.js';

/**
 * A single recommendation item returned by the API
 */
export interface RecommendationItem {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  similarity: number;
  dominantCategory: string;
}

/**
 * Full recommendations response from the API
 */
export interface RecommendationsResponse {
  items: RecommendationItem[];
  label: string;
}

/**
 * RecommendationsService - Fetches personalised book recommendations
 *
 * Wraps GET /api/books/recommendations and returns the typed response.
 */
@Injectable({
  providedIn: 'root',
})
export class RecommendationsService {
  private readonly api = inject(ApiService);

  /**
   * Retrieve personalised recommendations for the current user.
   *
   * @returns Observable of RecommendationsResponse
   */
  getRecommendations(): Observable<RecommendationsResponse> {
    return this.api.get<RecommendationsResponse>('/books/recommendations');
  }
}
