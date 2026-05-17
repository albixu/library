import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { Book } from '../models/index.js';
import { BookService } from './book.service.js';

/**
 * Result of a send to Kindle operation
 */
export interface SendToKindleResult {
  success: boolean;
  message: string;
}

/**
 * KindleService - Service for sending books to Kindle via email
 *
 * Delegates the actual email delivery to BookService.sendBookByEmail(),
 * which calls the real API endpoint POST /api/books/:id/send.
 *
 * Features:
 * - Kindle-specific email validation (isKindleEmail)
 * - Maps API response to SendToKindleResult
 * - Handles API errors gracefully
 */
@Injectable({
  providedIn: 'root',
})
export class KindleService {
  private readonly bookService = inject(BookService);

  /**
   * Kindle email domain patterns
   */
  private readonly kindleDomains = ['kindle.com', 'kindle.cn'];

  /**
   * Send a book to a Kindle device via email
   *
   * Delegates to BookService.sendBookByEmail() which calls the real API.
   *
   * @param book - The book to send
   * @param email - The Kindle email address
   * @returns Observable with the result
   */
  sendToKindle(book: Book, email: string): Observable<SendToKindleResult> {
    return this.bookService.sendBookByEmail(book.id, email).pipe(
      map(() => ({
        success: true,
        message: `"${book.title}" ha sido enviado a ${email}. ¡Comprueba tu Kindle!`,
      })),
      catchError(() =>
        of({
          success: false,
          message: 'Error al enviar el libro. Por favor, inténtalo de nuevo.',
        })
      )
    );
  }

  /**
   * Check if email is a Kindle email address
   *
   * @param email - Email to check
   * @returns true if email is a Kindle address
   */
  isKindleEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const lowerEmail = email.toLowerCase().trim();
    return this.kindleDomains.some((domain) => lowerEmail.endsWith(`@${domain}`));
  }
}
