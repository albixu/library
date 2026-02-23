import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

import { Book } from '../models/index.js';

/**
 * Result of a send to Kindle operation
 */
export interface SendToKindleResult {
  success: boolean;
  message: string;
}

/**
 * KindleService - Mock service for sending books to Kindle
 *
 * This is a mock implementation that simulates the send-to-kindle functionality.
 * In a real implementation, this would call an API endpoint.
 *
 * Features:
 * - Email validation
 * - Kindle-specific email validation
 * - Simulated send operation with delay
 */
@Injectable({
  providedIn: 'root',
})
export class KindleService {
  /**
   * Simulated delay for mock operations (ms)
   */
  private readonly mockDelay = 1000;

  /**
   * Email validation regex
   */
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Kindle email domain patterns
   */
  private readonly kindleDomains = ['kindle.com', 'kindle.cn'];

  /**
   * Send a book to a Kindle device
   *
   * @param book - The book to send
   * @param email - The Kindle email address
   * @returns Observable with the result
   */
  sendToKindle(book: Book, email: string): Observable<SendToKindleResult> {
    // Validate email
    if (!this.validateKindleEmail(email)) {
      return of({
        success: false,
        message: 'Invalid email address',
      }).pipe(delay(this.mockDelay));
    }

    // Check book availability
    if (!book.available) {
      return of({
        success: false,
        message: `Book "${book.title}" is not available for sending`,
      }).pipe(delay(this.mockDelay));
    }

    // Mock successful send
    return of({
      success: true,
      message: `"${book.title}" has been sent to ${email}. Check your Kindle!`,
    }).pipe(delay(this.mockDelay));
  }

  /**
   * Validate email format
   *
   * @param email - Email to validate
   * @returns true if email format is valid
   */
  validateKindleEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    return this.emailRegex.test(email.trim());
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
