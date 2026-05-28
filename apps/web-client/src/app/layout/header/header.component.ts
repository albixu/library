import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';

import { AuthService } from '../../auth/auth.service.js';
import { LoginModalComponent } from '../../auth/login-modal/login-modal.component.js';

/**
 * HeaderComponent - Application header with logo, actions and auth state
 *
 * Features:
 * - Sticky positioning at top
 * - Logo with auto_stories icon in cyan container
 * - "BiblioManager" title with bold styling
 * - Theme toggle and profile icons on the right
 * - Auth-aware: shows login modal when unauthenticated, user menu when authenticated
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <a class="header__brand-link" routerLink="/books" aria-label="Ir al catálogo">
        <div class="header__brand">
          <div class="header__logo">
            <span class="material-symbols-outlined">auto_stories</span>
          </div>
          <span class="header__title">BiblioManager</span>
        </div>
      </a>

      @if (authService.currentUser() !== null) {
        <nav class="header__nav" aria-label="Navegación principal">
          <a
            class="header__nav-link"
            routerLink="/books"
            routerLinkActive="header__nav-link--active"
            aria-label="Catálogo de libros"
          >
            <span class="material-symbols-outlined header__nav-icon" aria-hidden="true">menu_book</span>
            Catálogo
          </a>
          <a
            class="header__nav-link"
            routerLink="/recommendations"
            routerLinkActive="header__nav-link--active"
            aria-label="Para ti — recomendaciones personalizadas"
          >
            <span class="material-symbols-outlined header__nav-icon" aria-hidden="true"
              >recommend</span
            >
            Para ti
          </a>
        </nav>
      }

      <div class="header__actions">
        @if (authService.currentUser() === null) {
          <!-- Unauthenticated: show login icon -->
          <div
            class="header__avatar"
            role="button"
            tabindex="0"
            aria-label="Iniciar sesión"
            (click)="openLoginModal()"
            (keydown.enter)="openLoginModal()"
          >
            <span class="material-symbols-outlined">account_circle</span>
          </div>
        } @else {
          <!-- Authenticated: show user menu -->
          <div
            class="header__user"
            (click)="toggleDropdown()"
            (keydown.enter)="toggleDropdown()"
            role="button"
            tabindex="0"
            aria-label="Menú de usuario"
            aria-haspopup="true"
            [attr.aria-expanded]="isDropdownOpen()"
          >
            <span class="header__email">{{ authService.currentUser()!.email }}</span>
            <span class="material-symbols-outlined header__user-icon">account_circle</span>
            @if (isDropdownOpen()) {
              <div class="header__dropdown" role="menu">
                <button class="header__dropdown-item" role="menuitem" (click)="logout($event)">
                  <span class="material-symbols-outlined">logout</span>
                  Desconectarse
                </button>
              </div>
            }
          </div>
        }
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .header {
        position: sticky;
        top: 0;
        z-index: var(--z-sticky);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        height: 64px;
        padding: 0 1.5rem;
        background-color: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--color-border);
        transition:
          background-color 250ms ease,
          border-color 250ms ease;
      }

      :host-context([data-theme='dark']) .header {
        background-color: rgba(17, 29, 33, 0.8);
      }

      .header__brand-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
      }

      .header__brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      .header__logo {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background-color: var(--color-accent);
        border-radius: 0.5rem;
      }

      .header__logo .material-symbols-outlined {
        color: white;
        font-size: 20px;
        width: 20px;
        height: 20px;
        font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }

      .header__title {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: var(--color-text-primary);
      }

      .header__actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-shrink: 0;
      }

      /* Navigation links */
      .header__nav {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex: 1;
        padding-left: 1.5rem;
      }

      .header__nav-link {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        text-decoration: none;
        transition:
          background-color 150ms ease,
          color 150ms ease;

        [data-theme='dark'] & {
          color: rgb(148 163 184);

          &:hover {
            background-color: rgb(30 41 59);
            color: rgb(203 213 225);
          }
        }

        &:focus-visible {
          outline: 2px solid #17a1cf;
          outline-offset: 2px;
        }
      }

      .header__nav-link--active {
        [data-theme='dark'] & {
          background-color: rgb(30 41 59);
          color: rgb(23 161 207);
        }
      }

      .header__nav-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 18;
      }

      /* Unauthenticated avatar */
      .header__avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 9999px;
        background-color: rgb(226 232 240); /* slate-200 */
        overflow: hidden;
        cursor: pointer;
      }

      :host-context([data-theme='dark']) .header__avatar {
        background-color: rgb(51 65 85); /* slate-700 */
      }

      .header__avatar .material-symbols-outlined {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: rgb(71 85 105); /* slate-600 */
        font-variation-settings:
          'FILL' 1,
          'wght' 400,
          'GRAD' 0,
          'opsz' 24;
      }

      :host-context([data-theme='dark']) .header__avatar .material-symbols-outlined {
        color: rgb(148 163 184); /* slate-400 */
      }

      /* Authenticated user area */
      .header__user {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        background-color: rgb(226 232 240);
        cursor: pointer;
        transition: background-color 150ms ease;
        user-select: none;
      }

      .header__user:hover {
        background-color: rgb(203 213 225);
      }

      :host-context([data-theme='dark']) .header__user {
        background-color: rgb(51 65 85);
      }

      :host-context([data-theme='dark']) .header__user:hover {
        background-color: rgb(71 85 105);
      }

      .header__email {
        font-size: 0.8125rem;
        font-weight: 500;
        color: rgb(51 65 85);
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      :host-context([data-theme='dark']) .header__email {
        color: rgb(203 213 225);
      }

      .header__user-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: rgb(71 85 105);
        font-variation-settings:
          'FILL' 1,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }

      :host-context([data-theme='dark']) .header__user-icon {
        color: rgb(148 163 184);
      }

      /* Dropdown */
      .header__dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 100;
        min-width: 160px;
        background-color: white;
        border: 1px solid rgb(226 232 240);
        border-radius: 0.5rem;
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -2px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      :host-context([data-theme='dark']) .header__dropdown {
        background-color: rgb(17 29 33);
        border-color: rgb(51 65 85);
      }

      .header__dropdown-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: none;
        background-color: transparent;
        font-size: 0.875rem;
        color: rgb(51 65 85);
        cursor: pointer;
        transition: background-color 150ms ease;
        text-align: left;
      }

      .header__dropdown-item:hover {
        background-color: rgb(241 245 249);
      }

      :host-context([data-theme='dark']) .header__dropdown-item {
        color: rgb(203 213 225);
      }

      :host-context([data-theme='dark']) .header__dropdown-item:hover {
        background-color: rgb(30 41 59);
      }

      .header__dropdown-item .material-symbols-outlined {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    `,
  ],
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  private readonly dialog = inject(Dialog);

  readonly isDropdownOpen = signal(false);

  openLoginModal(): void {
    this.dialog.open(LoginModalComponent, {
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop',
      hasBackdrop: true,
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  logout(event: Event): void {
    // Prevent click from bubbling to parent (which would re-toggle dropdown)
    event.stopPropagation();
    this.authService.logout().subscribe(() => {
      this.isDropdownOpen.set(false);
    });
  }
}
