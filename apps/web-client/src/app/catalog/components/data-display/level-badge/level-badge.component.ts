import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BookLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [],
  template: `
    @if (level()) {
      <span class="level-badge" [class]="levelClass()" [attr.aria-label]="'Book level: ' + level()">
        {{ level() }}
      </span>
    }
  `,
  styles: `
    .level-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      white-space: nowrap;
    }

    /* Light mode colors - using CSS custom properties for theme support */
    .level-beginner {
      background-color: rgb(220 252 231); /* green-100 */
      color: rgb(21 128 61); /* green-700 */
    }

    .level-intermediate {
      background-color: rgb(254 243 199); /* amber-100 */
      color: rgb(180 83 9); /* amber-700 */
    }

    .level-advanced {
      background-color: rgb(254 226 226); /* red-100 */
      color: rgb(185 28 28); /* red-700 */
    }

    .level-expert {
      background-color: rgb(243 232 255); /* purple-100 */
      color: rgb(126 34 206); /* purple-700 */
    }

    .level-unknown {
      background-color: rgb(243 244 246); /* gray-100 */
      color: rgb(55 65 81); /* gray-700 */
    }

    /* Dark mode colors */
    @media (prefers-color-scheme: dark) {
      .level-beginner {
        background-color: rgb(20 83 45 / 0.3); /* green-900/30 */
        color: rgb(74 222 128); /* green-400 */
      }

      .level-intermediate {
        background-color: rgb(120 53 15 / 0.3); /* amber-900/30 */
        color: rgb(251 191 36); /* amber-400 */
      }

      .level-advanced {
        background-color: rgb(127 29 29 / 0.3); /* red-900/30 */
        color: rgb(248 113 113); /* red-400 */
      }

      .level-expert {
        background-color: rgb(88 28 135 / 0.3); /* purple-900/30 */
        color: rgb(192 132 252); /* purple-400 */
      }

      .level-unknown {
        background-color: rgb(31 41 55 / 0.3); /* gray-800/30 */
        color: rgb(156 163 175); /* gray-400 */
      }
    }

    /* Support for Angular Material theme dark mode via class */
    :host-context(.dark) .level-beginner,
    :host-context([data-theme='dark']) .level-beginner {
      background-color: rgb(20 83 45 / 0.3);
      color: rgb(74 222 128);
    }

    :host-context(.dark) .level-intermediate,
    :host-context([data-theme='dark']) .level-intermediate {
      background-color: rgb(120 53 15 / 0.3);
      color: rgb(251 191 36);
    }

    :host-context(.dark) .level-advanced,
    :host-context([data-theme='dark']) .level-advanced {
      background-color: rgb(127 29 29 / 0.3);
      color: rgb(248 113 113);
    }

    :host-context(.dark) .level-expert,
    :host-context([data-theme='dark']) .level-expert {
      background-color: rgb(88 28 135 / 0.3);
      color: rgb(192 132 252);
    }

    :host-context(.dark) .level-unknown,
    :host-context([data-theme='dark']) .level-unknown {
      background-color: rgb(31 41 55 / 0.3);
      color: rgb(156 163 175);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelBadgeComponent {
  readonly level = input<BookLevel | undefined>();

  readonly levelClass = computed(() => {
    const lvl = this.level();
    if (!lvl) return '';

    const classMap: Record<string, string> = {
      Beginner: 'level-badge level-beginner',
      Intermediate: 'level-badge level-intermediate',
      Advanced: 'level-badge level-advanced',
      Expert: 'level-badge level-expert',
    };

    return classMap[lvl] || 'level-badge level-unknown';
  });
}
