import { Component, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';

/**
 * ThemeToggleComponent - Switch to toggle between light and dark themes
 *
 * Features:
 * - Switch design with two buttons (light/dark)
 * - Active state highlighted with primary color
 * - Matches Stitch design system exactly
 * - Accessible with aria-labels and aria-pressed
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  template: `
    <div class="theme-switch" role="group" aria-label="Theme selection">
      <button
        class="theme-switch__button"
        [class.theme-switch__button--active]="themeService.theme() === 'light'"
        aria-label="Light mode"
        [attr.aria-pressed]="themeService.theme() === 'light'"
        (click)="themeService.setTheme('light')"
      >
        <span class="material-symbols-outlined">light_mode</span>
      </button>
      <button
        class="theme-switch__button"
        [class.theme-switch__button--active]="themeService.theme() === 'dark'"
        aria-label="Dark mode"
        [attr.aria-pressed]="themeService.theme() === 'dark'"
        (click)="themeService.setTheme('dark')"
      >
        <span class="material-symbols-outlined">dark_mode</span>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .theme-switch {
        display: flex;
        align-items: center;
        gap: 0;
        padding: 4px;
        background-color: rgb(241 245 249); /* slate-100 */
        border: 1px solid rgb(226 232 240); /* slate-200 */
        border-radius: 9999px;
        transition: all 150ms ease;
      }

      :host-context([data-theme='dark']) .theme-switch {
        background-color: rgb(30 41 59); /* slate-800 */
        border-color: rgb(51 65 85); /* slate-700 */
      }

      .theme-switch__button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 6px;
        border: none;
        border-radius: 9999px;
        background-color: transparent;
        color: rgb(148 163 184); /* slate-400 */
        cursor: pointer;
        transition: all 150ms ease;
      }

      .theme-switch__button:hover:not(.theme-switch__button--active) {
        color: rgb(71 85 105); /* slate-600 */
      }

      :host-context([data-theme='dark'])
        .theme-switch__button:hover:not(.theme-switch__button--active) {
        color: rgb(226 232 240); /* slate-200 */
      }

      .theme-switch__button--active {
        background-color: #17a1cf; /* primary */
        color: white;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }

      .theme-switch__button:focus-visible {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
      }

      .material-symbols-outlined {
        font-size: 20px;
        width: 20px;
        height: 20px;
        font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }
    `,
  ],
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
