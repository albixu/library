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
    }

    /* Light mode colors */
    :host-context(:not([data-theme='dark'])) {
      .level-beginner {
        background-color: #dcfce7;
        color: #15803d;
      }

      .level-intermediate {
        background-color: #fef3c7;
        color: #b45309;
      }

      .level-advanced {
        background-color: #fee2e2;
        color: #b91c1c;
      }

      .level-beginner-intermediate {
        background-color: #ccfbf1;
        color: #0f766e;
      }

      .level-intermediate-advanced {
        background-color: #fed7aa;
        color: #c2410c;
      }

      .level-unknown {
        background-color: #f3f4f6;
        color: #6b7280;
      }
    }

    /* Dark mode colors (from Figma design) */
    :host-context([data-theme='dark']) {
      .level-beginner {
        background-color: rgba(20, 83, 45, 0.3);
        color: #4ade80;
      }

      .level-intermediate {
        background-color: rgba(120, 53, 15, 0.3);
        color: #fbbf24;
      }

      .level-advanced {
        background-color: rgba(127, 29, 29, 0.3);
        color: #f87171;
      }

      .level-beginner-intermediate {
        background-color: rgba(19, 78, 74, 0.3);
        color: #2dd4bf;
      }

      .level-intermediate-advanced {
        background-color: rgba(124, 45, 18, 0.3);
        color: #fb923c;
      }

      .level-unknown {
        background-color: rgba(31, 41, 55, 0.3);
        color: #9ca3af;
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
