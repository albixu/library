import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Query parameters type for API requests
 */
export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

/**
 * ApiService - Core HTTP service for API communication
 *
 * This service provides a centralized interface for all API calls,
 * handling common concerns like base URL configuration and error handling.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api'; // Will be configured via environment

  /**
   * Performs a GET request to the specified endpoint
   * @param endpoint - API endpoint path
   * @param params - Optional query parameters
   */
  get<T>(endpoint: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      params: this.buildParams(params),
    });
  }

  /**
   * Performs a POST request to the specified endpoint
   */
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Performs a PUT request to the specified endpoint
   */
  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Performs a DELETE request to the specified endpoint
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }

  /**
   * Builds HttpParams from a QueryParams object
   * Handles arrays by repeating the param key (e.g., types=a&types=b)
   */
  private buildParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (Array.isArray(value)) {
        // Handle arrays by appending each value with the same key
        for (const item of value) {
          if (item) {
            httpParams = httpParams.append(key, item);
          }
        }
      } else {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return httpParams;
  }
}
