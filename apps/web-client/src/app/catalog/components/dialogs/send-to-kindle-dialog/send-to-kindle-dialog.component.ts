import { Component, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

import { Book } from '../../../../core/models/index.js';
import { KindleService, SendToKindleResult } from '../../../../core/services/kindle.service.js';

/**
 * Dialog result when closed after sending
 */
export interface SendToKindleDialogResult {
  success: boolean;
  email: string;
}

/**
 * Dialog state enum
 */
type DialogState = 'input' | 'sending' | 'success' | 'error';

/**
 * SendToKindleDialogComponent - Modal dialog for sending a book to Kindle
 *
 * Features:
 * - Email input with validation
 * - Warning for non-kindle emails
 * - Loading/success/error states
 * - Cancel/Send buttons
 * - Accessible with proper ARIA labels
 *
 * Usage:
 * ```typescript
 * const dialogRef = this.dialog.open(SendToKindleDialogComponent, {
 *   data: book,
 *   width: '400px'
 * });
 *
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result?.success) {
 *     console.log('Book sent to:', result.email);
 *   }
 * });
 * ```
 */
@Component({
  selector: 'app-send-to-kindle-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="dialog-container" role="dialog" aria-labelledby="dialog-title">
      <!-- Dialog Header -->
      <div class="dialog-header">
        <div class="dialog-title-wrapper">
          <span class="material-symbols-outlined dialog-icon">send_to_mobile</span>
          <h2 id="dialog-title" class="dialog-title">Send to Kindle</h2>
        </div>
      </div>

      <!-- Dialog Content -->
      <div class="dialog-content">
        <p class="book-title" data-testid="book-title">
          <strong>{{ book.title }}</strong>
        </p>

        @if (!book.available) {
          <div class="warning-banner unavailable" data-testid="unavailable-warning">
            <span class="material-symbols-outlined">warning</span>
            <span>This book is currently not available for sending.</span>
          </div>
        }

        @if (state() === 'input' || state() === 'sending') {
          <div class="form-field">
            <label for="kindle-email" class="form-label">Kindle Email</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">email</span>
              <input
                id="kindle-email"
                type="email"
                class="input-field"
                [class.input-error]="
                  emailControl.hasError('email') || emailControl.hasError('required')
                "
                [formControl]="emailControl"
                placeholder="your-email@kindle.com"
                aria-label="Kindle email address"
                [attr.aria-describedby]="'email-hint'"
              />
            </div>
            @if (emailControl.hasError('required') && emailControl.touched) {
              <span class="error-message">Email is required</span>
            }
            @if (emailControl.hasError('email') && !emailControl.hasError('required')) {
              <span class="error-message">Please enter a valid email address</span>
            }
            <span id="email-hint" class="hint-text">Enter your Kindle device email address</span>
          </div>

          @if (showKindleWarning()) {
            <div class="warning-banner kindle-warning" data-testid="kindle-warning">
              <span class="material-symbols-outlined">info</span>
              <span>
                For best results, use your @kindle.com email address. Other emails may work but are
                not guaranteed.
              </span>
            </div>
          }
        }

        @if (state() === 'sending') {
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Sending "{{ book.title }}" to your Kindle...</p>
          </div>
        }

        @if (state() === 'success') {
          <div class="result-container success" data-testid="success-message">
            <span class="material-symbols-outlined result-icon success">check_circle</span>
            <p>{{ result()?.message }}</p>
          </div>
        }

        @if (state() === 'error') {
          <div class="result-container error" data-testid="error-message">
            <span class="material-symbols-outlined result-icon error">error</span>
            <p>{{ result()?.message }}</p>
          </div>
        }
      </div>

      <!-- Dialog Actions -->
      <div class="dialog-actions">
        @if (state() === 'input' || state() === 'sending') {
          <button
            type="button"
            class="btn btn-secondary"
            data-testid="cancel-button"
            (click)="onCancel()"
            [disabled]="state() === 'sending'"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            data-testid="send-button"
            [disabled]="!canSend()"
            (click)="onSend()"
          >
            @if (state() === 'sending') {
              <span>Sending...</span>
            } @else {
              <span class="material-symbols-outlined btn-icon">send</span>
              <span>Send to Kindle</span>
            }
          </button>
        }

        @if (state() === 'success' || state() === 'error') {
          <button
            type="button"
            class="btn btn-primary"
            data-testid="close-button"
            (click)="onClose()"
          >
            Close
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dialog-container {
        background-color: rgb(30 41 59);
        border-radius: 0.75rem;
        min-width: 320px;
        max-width: 500px;
        width: 100%;
        box-shadow:
          0 20px 25px -5px rgb(0 0 0 / 0.3),
          0 8px 10px -6px rgb(0 0 0 / 0.3);
      }

      [data-theme='light'] .dialog-container {
        background-color: rgb(255 255 255);
        box-shadow:
          0 20px 25px -5px rgb(0 0 0 / 0.1),
          0 8px 10px -6px rgb(0 0 0 / 0.1);
      }

      /* Header */
      .dialog-header {
        padding: 1.5rem;
        border-bottom: 1px solid rgb(51 65 85);
      }

      [data-theme='light'] .dialog-header {
        border-bottom-color: rgb(226 232 240);
      }

      .dialog-title-wrapper {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .dialog-icon {
        font-size: 1.5rem;
        color: #17a1cf;
      }

      .dialog-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: rgb(241 245 249);
      }

      [data-theme='light'] .dialog-title {
        color: rgb(30 41 59);
      }

      /* Content */
      .dialog-content {
        padding: 1.5rem;
        min-height: 120px;
      }

      .book-title {
        margin: 0 0 1rem;
        font-size: 1rem;
        color: rgb(203 213 225);
      }

      [data-theme='light'] .book-title {
        color: rgb(51 65 85);
      }

      /* Form Field */
      .form-field {
        width: 100%;
        margin-bottom: 0.5rem;
      }

      .form-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: rgb(148 163 184);
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .input-icon {
        position: absolute;
        left: 0.75rem;
        font-size: 1.25rem;
        color: rgb(148 163 184);
        pointer-events: none;
      }

      .input-field {
        width: 100%;
        padding: 0.75rem 0.75rem 0.75rem 2.75rem;
        font-size: 0.9375rem;
        border: 1px solid rgb(51 65 85);
        border-radius: 0.5rem;
        background-color: rgb(15 23 42);
        color: rgb(241 245 249);
        transition:
          border-color 150ms,
          box-shadow 150ms;
      }

      .input-field::placeholder {
        color: rgb(100 116 139);
      }

      .input-field:focus {
        outline: none;
        border-color: #17a1cf;
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
      }

      .input-field.input-error {
        border-color: rgb(239 68 68);
      }

      [data-theme='light'] .input-field {
        background-color: rgb(255 255 255);
        color: rgb(30 41 59);
        border-color: rgb(226 232 240);
      }

      [data-theme='light'] .input-field::placeholder {
        color: rgb(148 163 184);
      }

      .error-message {
        display: block;
        margin-top: 0.375rem;
        font-size: 0.75rem;
        color: rgb(239 68 68);
      }

      .hint-text {
        display: block;
        margin-top: 0.375rem;
        font-size: 0.75rem;
        color: rgb(148 163 184);
      }

      /* Warning Banners */
      .warning-banner {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        margin-top: 0.75rem;
        font-size: 0.875rem;
      }

      .warning-banner .material-symbols-outlined {
        flex-shrink: 0;
        font-size: 1.25rem;
      }

      .warning-banner.kindle-warning {
        background-color: rgba(23, 161, 207, 0.1);
        color: rgb(147 197 253);
        border: 1px solid rgba(23, 161, 207, 0.3);
      }

      [data-theme='light'] .warning-banner.kindle-warning {
        background-color: rgba(23, 161, 207, 0.1);
        color: rgb(7 89 133);
      }

      .warning-banner.unavailable {
        background-color: rgba(239, 68, 68, 0.1);
        color: rgb(252 165 165);
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      [data-theme='light'] .warning-banner.unavailable {
        background-color: rgba(239, 68, 68, 0.1);
        color: rgb(153 27 27);
      }

      /* Loading Container */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.5rem 0;
        gap: 1rem;
      }

      .loading-container p {
        margin: 0;
        color: rgb(148 163 184);
      }

      /* Custom Spinner */
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgb(51 65 85);
        border-top-color: #17a1cf;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Result Container */
      .result-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1.5rem 0;
        gap: 0.75rem;
      }

      .result-icon {
        font-size: 3rem;
      }

      .result-icon.success {
        color: #17a1cf;
      }

      .result-icon.error {
        color: rgb(239 68 68);
      }

      .result-container p {
        margin: 0;
        font-size: 1rem;
        color: rgb(203 213 225);
      }

      [data-theme='light'] .result-container p {
        color: rgb(51 65 85);
      }

      /* Dialog Actions */
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        border-top: 1px solid rgb(51 65 85);
      }

      [data-theme='light'] .dialog-actions {
        border-top-color: rgb(226 232 240);
      }

      /* Buttons */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        font-size: 0.9375rem;
        font-weight: 500;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
        transition:
          background-color 150ms,
          transform 100ms;
      }

      .btn:active:not(:disabled) {
        transform: scale(0.98);
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-icon {
        font-size: 1.125rem;
      }

      .btn-primary {
        background-color: #17a1cf;
        color: rgb(255 255 255);
      }

      .btn-primary:hover:not(:disabled) {
        background-color: #1589b3;
      }

      .btn-secondary {
        background-color: transparent;
        color: rgb(203 213 225);
        border: 1px solid rgb(51 65 85);
      }

      .btn-secondary:hover:not(:disabled) {
        background-color: rgb(51 65 85);
      }

      [data-theme='light'] .btn-secondary {
        color: rgb(71 85 105);
        border-color: rgb(203 213 225);
      }

      [data-theme='light'] .btn-secondary:hover:not(:disabled) {
        background-color: rgb(241 245 249);
      }
    `,
  ],
})
export class SendToKindleDialogComponent {
  private readonly dialogRef = inject(DialogRef<SendToKindleDialogResult>);
  private readonly kindleService = inject(KindleService);

  readonly book: Book = inject(DIALOG_DATA);

  // Form control
  readonly emailControl = new FormControl('', [Validators.required, Validators.email]);

  // State
  readonly state = signal<DialogState>('input');
  readonly result = signal<SendToKindleResult | null>(null);

  // Computed
  readonly showKindleWarning = computed(() => {
    const email = this.emailControl.value ?? '';
    return email.length > 0 && this.emailControl.valid && !this.kindleService.isKindleEmail(email);
  });

  readonly canSend = computed(() => {
    return this.emailControl.valid && this.state() === 'input' && this.book.available;
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSend(): void {
    if (!this.canSend()) {
      return;
    }

    const email = this.emailControl.value?.trim() ?? '';
    this.state.set('sending');

    this.kindleService.sendToKindle(this.book, email).subscribe({
      next: (result) => {
        this.result.set(result);
        this.state.set(result.success ? 'success' : 'error');
      },
      error: () => {
        this.result.set({
          success: false,
          message: 'An unexpected error occurred. Please try again.',
        });
        this.state.set('error');
      },
    });
  }

  onClose(): void {
    const email = this.emailControl.value?.trim() ?? '';
    const sendResult = this.result();

    if (sendResult?.success) {
      this.dialogRef.close({ success: true, email } as SendToKindleDialogResult);
    } else {
      this.dialogRef.close();
    }
  }
}
