import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
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
  imports: [MatIconButton, MatIcon, MatTooltip],
  template: `
    <button
      mat-icon-button
      [attr.aria-label]="themeService.toggleLabel()"
      [matTooltip]="themeService.toggleLabel()"
      (click)="themeService.toggleTheme()"
    >
      <mat-icon>{{ themeService.themeIcon() }}</mat-icon>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      button {
        transition: transform var(--transition-fast);

        &:hover {
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.95);
        }
      }

      mat-icon {
        transition: transform var(--transition-normal);
      }
    `,
  ],
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
