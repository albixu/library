import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Import the canonical BookLevelName type from core models
import { BookLevelName } from '../../../../core/models/index.js';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [],
  template: `
    @if (level()) {
      <span
        class="level-badge"
        [class]="levelClass()"
        [attr.aria-label]="'Nivel del libro: ' + level()"
      >
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

    /* Beginner - Green */
    .level-beginner {
      background-color: rgba(34, 197, 94, 0.15);
      color: #4ade80; /* green-400 */
    }

    /* Intermediate - Amber */
    .level-intermediate {
      background-color: rgba(251, 191, 36, 0.15);
      color: #fbbf24; /* amber-400 */
    }

    /* Advanced - Red */
    .level-advanced {
      background-color: rgba(239, 68, 68, 0.15);
      color: #f87171; /* red-400 */
    }

    /* Beginner to Intermediate - Blue */
    .level-beginner-intermediate {
      background-color: rgba(59, 130, 246, 0.15);
      color: #60a5fa; /* blue-400 */
    }

    /* Intermediate to Advanced - Purple */
    .level-intermediate-advanced {
      background-color: rgba(168, 85, 247, 0.15);
      color: #c084fc; /* purple-400 */
    }

    /* Unknown - Gray */
    .level-unknown {
      background-color: rgba(31, 41, 55, 0.3);
      color: #9ca3af; /* gray-400 */
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelBadgeComponent {
  readonly level = input<BookLevelName | null | undefined>();

  readonly levelClass = computed(() => {
    const lvl = this.level();
    if (!lvl) return '';

    // Map levels to CSS classes
    const classMap: Record<BookLevelName, string> = {
      Beginner: 'level-badge level-beginner',
      Intermediate: 'level-badge level-intermediate',
      Advanced: 'level-badge level-advanced',
      'Beginner to intermediate': 'level-badge level-beginner-intermediate',
      'Intermediate to advanced': 'level-badge level-intermediate-advanced',
    };

    return classMap[lvl] || 'level-badge level-unknown';
  });
}
