import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Import the canonical BookLevelName type from core models
import { BookLevelName } from '../../../../core/models/index.js';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [],
  template: `
    @if (level()) {
      <span class="level-badge" [class]="levelClass()" [attr.aria-label]="'Nivel del libro: ' + level()">
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
    }

    /* Light mode colors - from Stitch design */
    :host-context(:not([data-theme='dark'])) {
      .level-beginner {
        background-color: #dcfce7; /* green-100 */
        color: #15803d; /* green-700 */
      }

      .level-intermediate {
        background-color: #fef3c7; /* amber-100 */
        color: #b45309; /* amber-700 */
      }

      .level-advanced {
        background-color: #fee2e2; /* red-100 */
        color: #b91c1c; /* red-700 */
      }

      .level-beginner-intermediate {
        background-color: #dbeafe; /* blue-100 */
        color: #1e40af; /* blue-700 */
      }

      .level-intermediate-advanced {
        background-color: #fed7aa; /* orange-100 */
        color: #c2410c; /* orange-700 */
      }

      .level-unknown {
        background-color: #f3f4f6; /* gray-100 */
        color: #6b7280; /* gray-500 */
      }
    }

    /* Dark mode colors - from Stitch design */
    :host-context([data-theme='dark']) {
      .level-beginner {
        background-color: rgba(34, 197, 94, 0.15); /* green-900/30 equivalent */
        color: #4ade80; /* green-400 */
      }

      .level-intermediate {
        background-color: rgba(251, 191, 36, 0.15); /* amber-900/30 equivalent */
        color: #fbbf24; /* amber-400 */
      }

      .level-advanced {
        background-color: rgba(239, 68, 68, 0.15); /* red-900/30 equivalent */
        color: #f87171; /* red-400 */
      }

      .level-beginner-intermediate {
        background-color: rgba(59, 130, 246, 0.15); /* blue-900/30 equivalent */
        color: #60a5fa; /* blue-400 */
      }

      .level-intermediate-advanced {
        background-color: rgba(249, 115, 22, 0.15); /* orange-900/30 equivalent */
        color: #fb923c; /* orange-400 */
      }

      .level-unknown {
        background-color: rgba(31, 41, 55, 0.3);
        color: #9ca3af; /* gray-400 */
      }
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
