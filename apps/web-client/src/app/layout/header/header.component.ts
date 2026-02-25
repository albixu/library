import { Component, ChangeDetectionStrategy } from '@angular/core';
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
  imports: [ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="header__brand">
        <div class="header__logo">
          <span class="material-symbols-outlined">auto_stories</span>
        </div>
        <span class="header__title">BiblioManager</span>
      </div>

      <div class="header__search">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          class="input-base search-input-padding"
          placeholder="Global search..."
          aria-label="Global search"
        />
      </div>

      <div class="header__actions">
        <button class="btn-icon" aria-label="Notifications">
          <span class="material-symbols-outlined">notifications_none</span>
        </button>
        <app-theme-toggle />
        <button class="btn-icon" aria-label="User profile">
          <span class="material-symbols-outlined">account_circle</span>
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
        pointer-events: none;
        z-index: 1;
        font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }

      .search-input-padding {
        padding-left: 44px;
      }

      .header__actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
    `,
  ],
})
export class HeaderComponent {}
