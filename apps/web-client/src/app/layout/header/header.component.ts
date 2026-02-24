import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';

/**
 * HeaderComponent - Application header with logo, search, and actions
 *
 * Features:
 * - Sticky positioning at top
 * - Logo with auto_stories icon in cyan container
 * - "BiblioManager" title with bold styling
 * - Global search bar in the center
 * - Notifications, theme toggle, and profile icons on the right
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatIcon, MatButtonModule, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="header__brand">
        <div class="header__logo">
          <mat-icon>auto_stories</mat-icon>
        </div>
        <span class="header__title">BiblioManager</span>
      </div>
      
      <div class="header__search">
        <mat-icon class="search-icon">search</mat-icon>
        <input 
          type="text" 
          class="search-input" 
          placeholder="Global search..."
          aria-label="Global search"
        />
      </div>

      <div class="header__actions">
        <button mat-icon-button aria-label="Notifications">
          <mat-icon>notifications_none</mat-icon>
        </button>
        <app-theme-toggle />
        <button mat-icon-button aria-label="User profile">
          <mat-icon>account_circle</mat-icon>
        </button>
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
        gap: var(--spacing-6);
        height: 64px;
        padding: 0 var(--spacing-6);
        background-color: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--color-border);
        transition:
          background-color var(--transition-normal),
          border-color var(--transition-normal);
      }

      [data-theme='dark'] .header {
        background-color: rgba(17, 29, 33, 0.8);
      }

      .header__brand {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        flex-shrink: 0;
      }

      .header__logo {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background-color: var(--color-accent);
        border-radius: var(--radius-md);

        mat-icon {
          color: white;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .header__title {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: var(--color-text-primary);
      }

      .header__search {
        position: relative;
        flex: 1;
        max-width: 600px;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 12px;
        color: var(--color-text-muted);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .search-input {
        width: 100%;
        height: 40px;
        padding: 0 16px 0 44px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background-color: var(--color-bg-input);
        color: var(--color-text-primary);
        font-size: 0.875rem;
        transition: all 0.2s ease;

        &::placeholder {
          color: var(--color-text-muted);
        }

        &:hover {
          border-color: var(--color-border-strong);
        }

        &:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
        }
      }

      .header__actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        flex-shrink: 0;
      }

      .header__actions button {
        color: var(--color-text-secondary);

        &:hover {
          color: var(--color-text-primary);
        }
      }
    `,
  ],
})
export class HeaderComponent {}
