import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * FooterComponent - Application footer with copyright and GitHub link
 *
 * Features:
 * - Copyright text with year
 * - Link to GitHub repository
 * - Security attributes for external link
 * - Responsive design
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <span class="footer__copyright">© 2025 Library</span>
      <span class="footer__separator">•</span>
      <a
        href="https://github.com/albixu/library"
        target="_blank"
        rel="noopener noreferrer"
        class="footer__link"
      >
        GitHub
      </a>
    </footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2);
        padding: var(--spacing-4);
        background-color: var(--color-bg-surface);
        border-top: 1px solid var(--color-border);
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        transition:
          background-color var(--transition-normal),
          border-color var(--transition-normal),
          color var(--transition-normal);
      }

      .footer__copyright {
        color: var(--color-text-secondary);
      }

      .footer__separator {
        color: var(--color-text-muted);
      }

      .footer__link {
        color: var(--color-accent);
        text-decoration: none;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        &:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      }
    `,
  ],
})
export class FooterComponent {}
