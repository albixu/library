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
          class="search-input" 
          placeholder="Global search..."
          aria-label="Global search"
        />
      </div>

      <div class="header__actions">
        <button class="icon-button" aria-label="Notifications">
          <span class="material-symbols-outlined">notifications_none</span>
        </button>
        <app-theme-toggle />
        <button class="icon-button" aria-label="User profile">
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
        transition: background-color 250ms ease, border-color 250ms ease;
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
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
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
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
      }

      .search-input {
        width: 100%;
        height: 40px;
        padding: 0 16px 0 44px;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        background-color: var(--color-bg-input);
        color: var(--color-text-primary);
        font-size: 0.875rem;
        transition: all 200ms ease;
      }

      .search-input::placeholder {
        color: var(--color-text-muted);
      }

      .search-input:hover {
        border-color: var(--color-border-strong);
      }

      .search-input:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
      }

      .header__actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .icon-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 0.5rem;
        background-color: transparent;
        color: rgb(100 116 139); /* slate-500 */
        cursor: pointer;
        transition: all 150ms ease;
      }

      :host-context([data-theme='dark']) .icon-button {
        color: rgb(148 163 184); /* slate-400 */
      }

      .icon-button:hover {
        background-color: rgb(241 245 249); /* slate-100 */
        color: rgb(15 23 42); /* slate-900 */
      }

      :host-context([data-theme='dark']) .icon-button:hover {
        background-color: rgb(30 41 59); /* slate-800 */
        color: rgb(241 245 249); /* slate-100 */
      }

      .icon-button:focus-visible {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
      }

      .icon-button .material-symbols-outlined {
        font-size: 20px;
        width: 20px;
        height: 20px;
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
      }
    `,
  ],
})
export class HeaderComponent {}
