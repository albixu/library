import { Component, ChangeDetectionStrategy, inject, signal, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DialogRef } from '@angular/cdk/dialog';
import { Subscription } from 'rxjs';

import { AuthService } from '../auth.service.js';

/**
 * LoginModalComponent — Standalone modal for user authentication
 *
 * Features:
 * - Reactive form with email + password
 * - Inline validation errors
 * - 401 / generic server error display
 * - Link to /reset-password
 * - Closes itself via DialogRef on successful login
 */
@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <!-- Header -->
      <div class="login-modal__header">
        <h2 id="login-modal-title" class="login-modal__title">Iniciar sesión</h2>
        <button class="login-modal__close" aria-label="Cerrar" (click)="close()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Form -->
      <form class="login-modal__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <!-- Email field -->
        <div class="login-modal__field">
          <label for="login-email" class="login-modal__label">Email</label>
          <input
            id="login-email"
            type="email"
            class="login-modal__input"
            [class.login-modal__input--error]="emailHasError()"
            formControlName="email"
            placeholder="tu@email.com"
            autocomplete="email"
          />
          @if (emailHasError()) {
            <span class="login-modal__error" role="alert">
              @if (form.controls.email.hasError('required')) {
                El email es obligatorio.
              } @else if (form.controls.email.hasError('email')) {
                Ingresá un email válido.
              }
            </span>
          }
        </div>

        <!-- Password field -->
        <div class="login-modal__field">
          <label for="login-password" class="login-modal__label">Contraseña</label>
          <input
            id="login-password"
            type="password"
            class="login-modal__input"
            [class.login-modal__input--error]="passwordHasError()"
            formControlName="password"
            placeholder="••••••••"
            autocomplete="current-password"
          />
          @if (passwordHasError()) {
            <span class="login-modal__error" role="alert"> La contraseña es obligatoria. </span>
          }
        </div>

        <!-- Server error -->
        @if (serverError()) {
          <div class="login-modal__server-error" role="alert">
            <span class="material-symbols-outlined login-modal__server-error-icon">error</span>
            {{ serverError() }}
          </div>
        }

        <!-- Submit -->
        <button type="submit" class="login-modal__submit" [disabled]="isLoading()">
          @if (isLoading()) {
            <span class="material-symbols-outlined login-modal__spinner">sync</span>
            Iniciando sesión...
          } @else {
            Iniciar sesión
          }
        </button>

        <!-- Forgot password -->
        <div class="login-modal__footer">
          <a routerLink="/reset-password" class="login-modal__link" (click)="close()">
            Olvidé mi contraseña
          </a>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .login-modal {
        background-color: rgb(17 29 33);
        border: 1px solid rgb(51 65 85);
        border-radius: 0.75rem;
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 8px 10px -6px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
        padding: 1.5rem;
      }

      .login-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }

      .login-modal__title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;
      }

      .login-modal__close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 9999px;
        background-color: transparent;
        color: rgb(100 116 139);
        cursor: pointer;
        transition: background-color 150ms ease;
      }

      .login-modal__close:hover {
        background-color: rgb(30 41 59);
      }

      .login-modal__close .material-symbols-outlined {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .login-modal__form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .login-modal__field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .login-modal__label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-primary);
      }

      .login-modal__input {
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: 1px solid rgb(51 65 85);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        color: rgb(226 232 240);
        background-color: rgb(30 41 59);
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease;
        outline: none;
        box-sizing: border-box;
      }

      .login-modal__input:focus {
        border-color: #17a1cf;
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.15);
      }

      .login-modal__input--error {
        border-color: rgb(239 68 68);
      }

      .login-modal__input--error:focus {
        border-color: rgb(239 68 68);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
      }

      .login-modal__error {
        font-size: 0.75rem;
        color: rgb(239 68 68);
      }

      .login-modal__server-error {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        color: rgb(252 165 165);
      }

      .login-modal__server-error-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .login-modal__submit {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.625rem 1rem;
        background-color: #17a1cf;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 150ms ease;
      }

      .login-modal__submit:hover:not(:disabled) {
        background-color: #1589b0;
      }

      .login-modal__submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .login-modal__spinner {
        font-size: 18px;
        width: 18px;
        height: 18px;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .login-modal__footer {
        text-align: center;
      }

      .login-modal__link {
        font-size: 0.875rem;
        color: #17a1cf;
        text-decoration: none;
      }

      .login-modal__link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class LoginModalComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  // optional: component can be used without CDK dialog in tests
  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly isLoading = signal(false);
  readonly serverError = signal<string | null>(null);

  private subscription: Subscription | null = null;

  emailHasError(): boolean {
    const ctrl = this.form.controls.email;
    return ctrl.invalid && ctrl.touched;
  }

  passwordHasError(): boolean {
    const ctrl = this.form.controls.password;
    return ctrl.invalid && ctrl.touched;
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.serverError.set(null);

    const { email, password } = this.form.value;

    this.subscription = this.authService.login(email!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.dialogRef?.close();
      },
      error: (err: { status?: number }) => {
        this.isLoading.set(false);
        if (err?.status === 401) {
          this.serverError.set('Credenciales incorrectas. Verificá tu email y contraseña.');
        } else {
          this.serverError.set('Error al iniciar sesión. Intentá de nuevo.');
        }
      },
    });
  }

  close(): void {
    this.dialogRef?.close();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
