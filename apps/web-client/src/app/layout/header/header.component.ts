import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';

/**
 * HeaderComponent - Application header with logo, search, and actions
 *
 * Features:
 * - Sticky positioning at top
 * - Logo with auto_stories icon in cyan container
 * - "BiblioManager" title with bold styling
 * - Global search bar in the center with clear button
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

      <div class="header__right">
        <div class="header__search">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            class="input-base search-input-padding"
            placeholder="Global search..."
            aria-label="Global search"
            [value]="searchValue()"
            (input)="onSearchInput($event)"
          />
          @if (showClearButton()) {
            <button
              type="button"
              class="btn-clear"
              data-testid="clear-search-button"
              aria-label="Clear search"
              (click)="onClearSearch()"
            >
              <span class="material-symbols-outlined icon-sm">close</span>
            </button>
          }
        </div>

        <div class="header__actions">
          <button class="header__icon-button" aria-label="Notifications">
            <span class="material-symbols-outlined">notifications</span>
          </button>
          <app-theme-toggle />
          <div class="header__avatar" role="img" aria-label="User profile">
            <span class="material-symbols-outlined">account_circle</span>
          </div>
        </div>
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

      .header__right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-shrink: 0;
      }

      .header__search {
        position: relative;
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
        padding-right: 2.5rem; /* Space for clear button */
        width: 256px;
        background-color: rgba(
          30,
          41,
          59,
          0.5
        ) !important; /* slate-800/50 - same as table header */
        border-color: rgba(30, 41, 59, 0.5) !important;
      }

      .search-input-padding:hover {
        background-color: rgba(30, 41, 59, 0.6) !important;
      }

      .search-input-padding:focus {
        background-color: rgba(30, 41, 59, 0.7) !important;
      }

      /* Clear button - positioned absolutely inside search wrapper */
      .btn-clear {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        color: #64748b; /* slate-500 */
        background-color: transparent;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        z-index: 2;
      }

      .btn-clear:hover {
        color: #f1f5f9; /* slate-100 */
        background-color: rgba(51, 65, 85, 0.5); /* slate-700 with opacity */
      }

      .btn-clear:active {
        background-color: rgba(51, 65, 85, 0.7);
      }

      .btn-clear:focus-visible {
        outline: 2px solid #17a1cf; /* primary */
        outline-offset: 2px;
      }

      .header__actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-shrink: 0;
        padding-left: 1.5rem;
        border-left: 1px solid var(--color-border);
      }

      .header__icon-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        border: none;
        background: transparent;
        color: rgb(100 116 139); /* slate-500 */
        cursor: pointer;
        transition: color 150ms ease;
      }

      :host-context([data-theme='dark']) .header__icon-button {
        color: rgb(100 116 139); /* slate-500 */
      }

      .header__icon-button:hover {
        color: #17a1cf; /* primary */
      }

      .header__icon-button .material-symbols-outlined {
        font-size: 20px;
        width: 20px;
        height: 20px;
        font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }

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
    `,
  ],
})
export class HeaderComponent {
  // Internal state for search input
  readonly searchValue = signal<string>('');

  // Computed property to show/hide clear button
  readonly showClearButton = computed(() => this.searchValue().length > 0);

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue.set(target.value);
    // TODO: Implement global search logic
  }

  onClearSearch(): void {
    this.searchValue.set('');
    // TODO: Clear global search results
  }
}
