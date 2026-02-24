import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';

/**
 * HeaderComponent - Application header with logo and theme toggle
 *
 * Features:
 * - Sticky positioning at top
 * - Logo with auto_stories icon in cyan container
 * - "Library" title with bold styling
 * - Theme toggle button on the right
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatIcon, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="header__brand">
        <div class="header__logo">
          <mat-icon>auto_stories</mat-icon>
        </div>
        <span class="header__title">Library</span>
      </div>
      <app-theme-toggle />
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
    `,
  ],
})
export class HeaderComponent {}
