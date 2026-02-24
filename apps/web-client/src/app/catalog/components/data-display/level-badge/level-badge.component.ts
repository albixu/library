import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Import the canonical BookLevelName type from core models
import { BookLevelName } from '../../../../core/models/index.js';

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
      padding: 0.25rem 0.625rem;
      font-size: 0.625rem;
      font-weight: 700;
      border-radius: 9999px;
      white-space: nowrap;
      text-transform: capitalize;
    }

    /* Light mode colors */
    .level-beginner {
      background-color: var(--level-beginner-bg, #dcfce7);
      color: var(--level-beginner-text, #15803d);
    }

    .level-intermediate {
      background-color: var(--level-intermediate-bg, #fef3c7);
      color: var(--level-intermediate-text, #b45309);
    }

    .level-advanced {
      background-color: var(--level-advanced-bg, #fee2e2);
      color: var(--level-advanced-text, #b91c1c);
    }

    .level-expert {
      background-color: var(--level-expert-bg, #f3e8ff);
      color: var(--level-expert-text, #7e22ce);
    }

    .level-beginner-intermediate {
      background-color: rgb(236 253 245); /* teal-50 */
      color: rgb(17 94 89); /* teal-700 */
    }

    .level-intermediate-advanced {
      background-color: rgb(255 237 213); /* orange-100 */
      color: rgb(194 65 12); /* orange-700 */
    }

    .level-unknown {
      background-color: rgb(243 244 246); /* gray-100 */
      color: rgb(55 65 81); /* gray-700 */
    }

    /* Dark mode colors via data-theme attribute on html */
    :host-context([data-theme='dark']) .level-beginner {
      background-color: var(--level-beginner-bg);
      color: var(--level-beginner-text);
    }

    :host-context([data-theme='dark']) .level-intermediate {
      background-color: var(--level-intermediate-bg);
      color: var(--level-intermediate-text);
    }

    :host-context([data-theme='dark']) .level-advanced {
      background-color: var(--level-advanced-bg);
      color: var(--level-advanced-text);
    }

    :host-context([data-theme='dark']) .level-expert {
      background-color: var(--level-expert-bg);
      color: var(--level-expert-text);
    }

    :host-context([data-theme='dark']) .level-beginner-intermediate {
      background-color: rgb(19 78 74 / 0.3);
      color: rgb(45 212 191);
    }

    :host-context([data-theme='dark']) .level-intermediate-advanced {
      background-color: rgb(124 45 18 / 0.3);
      color: rgb(251 146 60);
    }

    :host-context([data-theme='dark']) .level-unknown {
      background-color: rgb(31 41 55 / 0.3);
      color: rgb(156 163 175);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelBadgeComponent {
  readonly level = input<BookLevelName | null | undefined>();

  readonly levelClass = computed(() => {
    const lvl = this.level();
    if (!lvl) return '';

    // Map levels to CSS classes - compound levels use the higher level's style
    const classMap: Record<BookLevelName, string> = {
      Beginner: 'level-badge level-beginner',
      Intermediate: 'level-badge level-intermediate',
      Advanced: 'level-badge level-advanced',
      'Beginner to Intermediate': 'level-badge level-beginner-intermediate',
      'Intermediate to Advanced': 'level-badge level-intermediate-advanced',
    };

    return classMap[lvl] || 'level-badge level-unknown';
  });
}
