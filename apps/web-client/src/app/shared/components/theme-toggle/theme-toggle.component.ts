import { Component, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';

/**
 * ThemeToggleComponent - Button to toggle between light and dark themes
 *
 * Features:
 * - Accessible button with aria-label
 * - Tooltip showing next theme action
 * - Animated icon transition
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  template: `
    <button
      class="theme-toggle"
      [attr.aria-label]="themeService.toggleLabel()"
      [title]="themeService.toggleLabel()"
      (click)="themeService.toggleTheme()"
    >
      <span class="material-symbols-outlined">{{ themeService.themeIcon() }}</span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .theme-toggle {
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

      :host-context([data-theme='dark']) .theme-toggle {
        color: rgb(148 163 184); /* slate-400 */
      }

      .theme-toggle:hover {
        background-color: rgb(241 245 249); /* slate-100 */
        color: rgb(15 23 42); /* slate-900 */
        transform: scale(1.1);
      }

      :host-context([data-theme='dark']) .theme-toggle:hover {
        background-color: rgb(30 41 59); /* slate-800 */
        color: rgb(241 245 249); /* slate-100 */
      }

      .theme-toggle:active {
        transform: scale(0.95);
      }

      .theme-toggle:focus-visible {
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
        transition: transform 250ms ease;
      }
    `,
  ],
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
