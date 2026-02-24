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
      padding: 0.25rem 0.625rem; /* px-2.5 py-1 */
      font-size: 0.625rem; /* text-[10px] - 10px */
      font-weight: 700; /* font-bold */
      border-radius: 9999px; /* rounded-full */
      white-space: nowrap;
    }

    /* Dark mode colors - FROM FIGMA - Always applied */
    .level-beginner {
      background-color: #14532D; /* green-900 - FROM FIGMA */
      background-color: rgba(20, 83, 45, 0.3); /* green-900/30 */
      color: #4ADE80; /* green-400 - FROM FIGMA */
    }

    .level-intermediate {
      background-color: #78350F; /* amber-900 - FROM FIGMA */
      background-color: rgba(120, 53, 15, 0.3); /* amber-900/30 */
      color: #FBBF24; /* amber-400 - FROM FIGMA */
    }

    .level-advanced {
      background-color: #7F1D1D; /* red-900 - FROM FIGMA */
      background-color: rgba(127, 29, 29, 0.3); /* red-900/30 */
      color: #F87171; /* red-400 - FROM FIGMA */
    }

    .level-beginner-intermediate {
      background-color: rgba(19, 78, 74, 0.3); /* teal-900/30 */
      color: #2DD4BF; /* teal-400 */
    }

    .level-intermediate-advanced {
      background-color: rgba(124, 45, 18, 0.3); /* orange-900/30 */
      color: #FB923C; /* orange-400 */
    }

    .level-unknown {
      background-color: rgba(31, 41, 55, 0.3); /* gray-800/30 */
      color: #9CA3AF; /* gray-400 */
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
