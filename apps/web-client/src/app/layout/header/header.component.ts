import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';

/**
 * HeaderComponent - Application header with logo and actions
 *
 * Features:
 * - Sticky positioning at top
 * - Logo with auto_stories icon in cyan container
 * - "BiblioManager" title with bold styling
 * - Theme toggle and profile icons on the right
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

      <div class="header__actions">
        <app-theme-toggle />
        <!-- TODO: Descomentar cuando se implemente la gestión de usuarios/perfil (HU-035)
        <div class="header__avatar" role="img" aria-label="Perfil de usuario">
          <span class="material-symbols-outlined">account_circle</span>
        </div>
        -->
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

      .header__actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-shrink: 0;
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
export class HeaderComponent {}
