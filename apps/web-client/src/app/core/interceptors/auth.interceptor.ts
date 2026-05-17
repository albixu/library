// =============================================================================
// Auth Interceptor - Handles 401 responses with token refresh + retry
// =============================================================================

import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../../auth/auth.service.js';

/**
 * authInterceptor
 *
 * Intercepts HTTP 401 responses and attempts a token refresh.
 * If the refresh succeeds, retries the original request once.
 * If the refresh fails, clears the session and re-throws the error.
 *
 * Cookie-based auth: no need to add Authorization headers — the browser
 * sends the httpOnly cookie automatically with `withCredentials`.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      // Only handle 401 Unauthorized
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // Avoid infinite loop: if the failing request is /auth/refresh itself, bail out
      if (req.url.includes('/auth/refresh')) {
        authService.clearSession();
        return throwError(() => error);
      }

      // Attempt token refresh, then retry the original request
      return authService.refreshToken().pipe(
        switchMap((success) => {
          if (!success) {
            authService.clearSession();
            return throwError(() => error);
          }
          // Retry the original request — cookie is already refreshed
          return next(req);
        }),
        catchError((refreshError: unknown) => {
          authService.clearSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
