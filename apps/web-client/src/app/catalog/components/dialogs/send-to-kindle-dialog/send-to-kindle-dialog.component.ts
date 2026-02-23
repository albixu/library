import { Component, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dialog-icon">send_to_mobile</mat-icon>
      Send to Kindle
    </h2>

    <mat-dialog-content>
      <p class="book-title" data-testid="book-title">
        <strong>{{ book.title }}</strong>
      </p>

      @if (!book.available) {
        <div class="warning-banner unavailable" data-testid="unavailable-warning">
          <mat-icon>warning</mat-icon>
          <span>This book is currently not available for sending.</span>
        </div>
      }

      @if (state() === 'input' || state() === 'sending') {
        <mat-form-field appearance="outline" class="email-field">
          <mat-label>Kindle Email</mat-label>
          <mat-icon matPrefix>email</mat-icon>
          <input
            matInput
            type="email"
            [formControl]="emailControl"
            placeholder="your-email@kindle.com"
            aria-label="Kindle email address"
            [attr.aria-describedby]="'email-hint'"
          />
          @if (emailControl.hasError('required') && emailControl.touched) {
            <mat-error>Email is required</mat-error>
          }
          @if (emailControl.hasError('email') && !emailControl.hasError('required')) {
            <mat-error>Please enter a valid email address</mat-error>
          }
          <mat-hint id="email-hint">Enter your Kindle device email address</mat-hint>
        </mat-form-field>

        @if (showKindleWarning()) {
          <div class="warning-banner kindle-warning" data-testid="kindle-warning">
            <mat-icon>info</mat-icon>
            <span>
              For best results, use your @kindle.com email address. Other emails may work but are
              not guaranteed.
            </span>
          </div>
        }
      }

      @if (state() === 'sending') {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Sending "{{ book.title }}" to your Kindle...</p>
        </div>
      }

      @if (state() === 'success') {
        <div class="result-container success" data-testid="success-message">
          <mat-icon class="result-icon success">check_circle</mat-icon>
          <p>{{ result()?.message }}</p>
        </div>
      }

      @if (state() === 'error') {
        <div class="result-container error" data-testid="error-message">
          <mat-icon class="result-icon error">error</mat-icon>
          <p>{{ result()?.message }}</p>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (state() === 'input' || state() === 'sending') {
        <button
          mat-button
          data-testid="cancel-button"
          (click)="onCancel()"
          [disabled]="state() === 'sending'"
        >
          Cancel
        </button>
        <button
          mat-flat-button
          color="primary"
          data-testid="send-button"
          [disabled]="!canSend()"
          (click)="onSend()"
        >
          @if (state() === 'sending') {
            Sending...
          } @else {
            <mat-icon>send</mat-icon>
            Send to Kindle
          }
        </button>
      }

      @if (state() === 'success' || state() === 'error') {
        <button mat-flat-button color="primary" data-testid="close-button" (click)="onClose()">
          Close
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 16px 24px;
      }

      .dialog-icon {
        color: var(--mat-primary-color, #6750a4);
      }

      mat-dialog-content {
        min-width: 320px;
        padding: 0 24px 16px;
      }

      .book-title {
        margin: 0 0 16px;
        font-size: 1rem;
        color: var(--mat-sys-on-surface);
      }

      .email-field {
        width: 100%;
        margin-bottom: 8px;
      }

      .warning-banner {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 12px;
        border-radius: 8px;
        margin-top: 12px;
        font-size: 0.875rem;
      }

      .warning-banner mat-icon {
        flex-shrink: 0;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .warning-banner.kindle-warning {
        background-color: var(--mat-sys-tertiary-container, #ffd8e4);
        color: var(--mat-sys-on-tertiary-container, #31111d);
      }

      .warning-banner.unavailable {
        background-color: var(--mat-sys-error-container, #f9dedc);
        color: var(--mat-sys-on-error-container, #410e0b);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 0;
        gap: 16px;
      }

      .loading-container p {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
      }

      .result-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 24px 0;
        gap: 12px;
      }

      .result-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      .result-icon.success {
        color: var(--mat-sys-primary, #6750a4);
      }

      .result-icon.error {
        color: var(--mat-sys-error, #b3261e);
      }

      .result-container p {
        margin: 0;
        font-size: 1rem;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        gap: 8px;
      }

      mat-dialog-actions button mat-icon {
        margin-right: 4px;
      }
    `,
  ],
})
export class SendToKindleDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SendToKindleDialogComponent>);
  private readonly kindleService = inject(KindleService);

  readonly book: Book = inject(MAT_DIALOG_DATA);

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
