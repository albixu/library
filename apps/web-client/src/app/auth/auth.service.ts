import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiService } from '../core/services/api.service.js';

/**
 * AuthService - Manages authentication state and API calls
 *
 * State is managed via Angular Signals for reactive UI updates.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);

  /** Internal writable signal — only this service can mutate it */
  private readonly _currentUser = signal<{ email: string } | null>(null);

  /** Public read-only signal — components consume this */
  readonly currentUser = this._currentUser.asReadonly();

  /**
   * Authenticates the user against the API.
   * On success, updates the currentUser signal.
   *
   * @param email - User email
   * @param password - User password
   */
  login(email: string, password: string): Observable<void> {
    return this.api.post<void>('/auth/login', { email, password }).pipe(
      tap(() => this._currentUser.set({ email }))
    );
  }

  /**
   * Logs out the current user.
   * On success, clears the currentUser signal.
   */
  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout', {}).pipe(
      tap(() => this._currentUser.set(null))
    );
  }

  /**
   * Refreshes the authentication token.
   */
  refreshToken(): Observable<void> {
    return this.api.post<void>('/auth/refresh', {});
  }

  /**
   * Sends a password recovery email.
   *
   * @param email - User email to send the reset link to
   */
  forgotPassword(email: string): Observable<void> {
    return this.api.post<void>('/auth/forgot-password', { email });
  }

  /**
   * Resets the user password using a recovery token.
   *
   * @param token - Token received via email
   * @param newPassword - New password to set
   */
  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.api.post<void>('/auth/reset-password', { token, newPassword });
  }
}
