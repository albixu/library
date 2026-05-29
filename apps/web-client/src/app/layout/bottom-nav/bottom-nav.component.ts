import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';

import { AuthService } from '../../auth/auth.service.js';
import { LoginModalComponent } from '../../auth/login-modal/login-modal.component.js';

/**
 * BottomNavComponent - Mobile bottom navigation bar
 *
 * Features:
 * - Fixed positioning at the bottom of the viewport
 * - Auth-aware: shows nav links when authenticated, login button when not
 * - Glassmorphism background with blur effect
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bottom-nav" role="navigation" aria-label="Navegación móvil">
      @if (authService.currentUser() !== null) {
        <a
          class="bottom-nav__item"
          routerLink="/books"
          routerLinkActive="bottom-nav__item--active"
          aria-label="Catálogo de libros"
        >
          <span class="material-symbols-outlined bottom-nav__icon" aria-hidden="true"
            >menu_book</span
          >
          Catálogo
        </a>
        <a
          class="bottom-nav__item"
          routerLink="/recommendations"
          routerLinkActive="bottom-nav__item--active"
          aria-label="Para ti — recomendaciones personalizadas"
        >
          <span class="material-symbols-outlined bottom-nav__icon" aria-hidden="true"
            >recommend</span
          >
          Para ti
        </a>
        <button class="bottom-nav__item" (click)="logout()" aria-label="Cerrar sesión">
          <span class="material-symbols-outlined bottom-nav__icon" aria-hidden="true">logout</span>
          Salir
        </button>
      } @else {
        <button class="bottom-nav__item" (click)="openLoginModal()" aria-label="Iniciar sesión">
          <span class="material-symbols-outlined bottom-nav__icon" aria-hidden="true"
            >account_circle</span
          >
          Entrar
        </button>
      }
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: var(--bottom-nav-height, 56px);
        z-index: 40;
        display: flex;
        align-items: center;
        justify-content: space-around;
        background-color: rgba(17, 29, 33, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid var(--color-border);
      }

      .bottom-nav__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 4px 12px;
        color: rgb(148 163 184);
        text-decoration: none;
        font-size: 0.625rem;
        font-weight: 500;
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 0.5rem;
        transition: color 150ms ease;

        &:hover {
          color: var(--color-accent);
        }
      }

      .bottom-nav__item--active {
        color: var(--color-accent);
      }

      .bottom-nav__icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    `,
  ],
})
export class BottomNavComponent {
  readonly authService = inject(AuthService);
  private readonly dialog = inject(Dialog);

  openLoginModal(): void {
    this.dialog.open(LoginModalComponent, {
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop',
      hasBackdrop: true,
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
