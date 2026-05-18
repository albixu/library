import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../auth.service.js';

/**
 * Validator that checks both password fields match.
 */
function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');

  if (!password || !confirm) return null;
  if (password.value !== confirm.value) {
    confirm.setErrors({ mismatch: true });
    return { mismatch: true };
  }

  // Clear mismatch error only if that was the only error
  if (confirm.hasError('mismatch')) {
    confirm.setErrors(null);
  }
  return null;
}

/**
 * ResetPasswordPageComponent — Standalone page to reset user password
 *
 * Reads the `token` query param from the URL.
 * If missing → shows an invalid link error immediately.
 * On success → shows a confirmation message and navigates to `/` after 2s.
 */
@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rp-page">
      <div class="rp-card">
        <h1 class="rp-title">Restablecer contraseña</h1>

        <!-- No token in URL -->
        @if (!token) {
          <div class="rp-alert rp-alert--error" role="alert">
            <span class="material-symbols-outlined rp-alert__icon">link_off</span>
            <p>Enlace inválido. Por favor solicitá un nuevo enlace de recuperación.</p>
          </div>
        }

        <!-- Success state -->
        @if (token && isSuccess()) {
          <div class="rp-alert rp-alert--success" role="status">
            <span class="material-symbols-outlined rp-alert__icon">check_circle</span>
            <p>Contraseña cambiada. Redirigiendo al inicio...</p>
          </div>
        }

        <!-- Form -->
        @if (token && !isSuccess()) {
          <form class="rp-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <!-- New password field -->
            <div class="rp-field">
              <label for="rp-password" class="rp-label">Nueva contraseña</label>
              <input
                id="rp-password"
                type="password"
                class="rp-input"
                [class.rp-input--error]="passwordHasError()"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              @if (passwordHasError()) {
                <span class="rp-error" role="alert">
                  @if (form.controls.password.hasError('required')) {
                    La contraseña es obligatoria.
                  } @else if (form.controls.password.hasError('minlength')) {
                    Debe tener al menos 8 caracteres.
                  }
                </span>
              }
            </div>

            <!-- Confirm password field -->
            <div class="rp-field">
              <label for="rp-confirm" class="rp-label">Confirmar contraseña</label>
              <input
                id="rp-confirm"
                type="password"
                class="rp-input"
                [class.rp-input--error]="confirmHasError()"
                formControlName="confirmPassword"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              @if (confirmHasError()) {
                <span class="rp-error" role="alert">
                  @if (form.controls.confirmPassword.hasError('required')) {
                    Confirmá la contraseña.
                  } @else if (form.controls.confirmPassword.hasError('mismatch')) {
                    Las contraseñas no coinciden.
                  }
                </span>
              }
            </div>

            <!-- Server error -->
            @if (serverError()) {
              <div class="rp-alert rp-alert--error" role="alert">
                <span class="material-symbols-outlined rp-alert__icon">error</span>
                <p>{{ serverError() }}</p>
              </div>
            }

            <!-- Submit -->
            <button type="submit" class="rp-submit" [disabled]="isLoading()">
              @if (isLoading()) {
                <span class="material-symbols-outlined rp-spinner">sync</span>
                Cambiando...
              } @else {
                Cambiar contraseña
              }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .rp-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        background-color: var(--color-bg-primary, #f8fafc);
      }

      :host-context([data-theme='dark']) .rp-page {
        background-color: rgb(10 20 25);
      }

      .rp-card {
        width: 100%;
        max-width: 28rem;
        background-color: white;
        border-radius: 0.75rem;
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 8px 10px -6px rgba(0, 0, 0, 0.1);
        padding: 2rem;
      }

      :host-context([data-theme='dark']) .rp-card {
        background-color: rgb(17 29 33);
        border: 1px solid rgb(51 65 85);
      }

      .rp-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 1.5rem;
      }

      /* ---- Form ---- */

      .rp-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .rp-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .rp-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-primary);
      }

      .rp-input {
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: 1px solid rgb(203 213 225);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        color: var(--color-text-primary);
        background-color: white;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease;
        outline: none;
        box-sizing: border-box;
      }

      .rp-input:focus {
        border-color: #17a1cf;
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.15);
      }

      .rp-input--error {
        border-color: rgb(239 68 68);
      }

      .rp-input--error:focus {
        border-color: rgb(239 68 68);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
      }

      :host-context([data-theme='dark']) .rp-input {
        background-color: rgb(30 41 59);
        border-color: rgb(51 65 85);
        color: rgb(226 232 240);
      }

      :host-context([data-theme='dark']) .rp-input:focus {
        border-color: #17a1cf;
      }

      .rp-error {
        font-size: 0.75rem;
        color: rgb(239 68 68);
      }

      /* ---- Alert ---- */

      .rp-alert {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
      }

      .rp-alert p {
        margin: 0;
        line-height: 1.4;
      }

      .rp-alert__icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .rp-alert--error {
        background-color: rgb(254 242 242);
        border: 1px solid rgb(252 165 165);
        color: rgb(185 28 28);
      }

      :host-context([data-theme='dark']) .rp-alert--error {
        background-color: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: rgb(252 165 165);
      }

      .rp-alert--success {
        background-color: rgb(240 253 244);
        border: 1px solid rgb(134 239 172);
        color: rgb(21 128 61);
      }

      :host-context([data-theme='dark']) .rp-alert--success {
        background-color: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: rgb(134 239 172);
      }

      /* ---- Submit ---- */

      .rp-submit {
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

      .rp-submit:hover:not(:disabled) {
        background-color: #1589b0;
      }

      .rp-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .rp-spinner {
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
    `,
  ],
})
export class ResetPasswordPageComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  token: string | null = null;

  readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator }
  );

  readonly isLoading = signal(false);
  readonly isSuccess = signal(false);
  readonly serverError = signal<string | null>(null);

  private subscription: Subscription | null = null;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  passwordHasError(): boolean {
    const ctrl = this.form.controls.password;
    return ctrl.invalid && ctrl.touched;
  }

  confirmHasError(): boolean {
    const ctrl = this.form.controls.confirmPassword;
    return ctrl.invalid && ctrl.touched;
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.token) {
      return;
    }

    this.isLoading.set(true);
    this.serverError.set(null);

    const { password } = this.form.value;

    this.subscription = this.authService.resetPassword(this.token, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        setTimeout(() => {
          void this.router.navigate(['/']);
        }, 2000);
      },
      error: (err: { status?: number }) => {
        this.isLoading.set(false);
        if (err?.status === 400 || err?.status === 401 || err?.status === 404) {
          this.serverError.set('El enlace ha expirado o ya fue utilizado. Solicitá uno nuevo.');
        } else {
          this.serverError.set('Ha ocurrido un error. Intentalo de nuevo.');
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
