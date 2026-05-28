import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-category-chips',
  standalone: true,
  imports: [],
  template: `
    @if (categories().length > 0) {
      <div class="category-chips-container" role="list" aria-label="Categorías">
        @for (category of visibleCategories(); track category) {
          <span class="category-chip" role="listitem">{{ category }}</span>
        }
        @if (overflowCount() > 0) {
          <span
            class="overflow-indicator"
            [title]="overflowTooltip()"
            role="listitem"
            [attr.aria-label]="overflowCount() + ' categorías más'"
          >
            +{{ overflowCount() }}
          </span>
        }
      </div>
    }
  `,
  styles: `
    .category-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      align-items: center;
    }

    .category-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      border-radius: 9999px;
      white-space: nowrap;
      background-color: rgb(30 41 59); /* slate-800 */
      color: rgb(148 163 184); /* slate-400 */
    }

    .overflow-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      cursor: help;
      background-color: rgb(51 65 85); /* slate-700 */
      color: rgb(203 213 225); /* slate-300 */
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryChipsComponent {
  readonly categories = input<string[]>([]);
  readonly maxVisible = input<number | undefined>(undefined);

  readonly visibleCategories = computed(() => {
    const cats = this.categories();
    const max = this.maxVisible();
    if (max === undefined || cats.length <= max) {
      return cats;
    }
    return cats.slice(0, max);
  });

  readonly overflowCount = computed(() => {
    const cats = this.categories();
    const max = this.maxVisible();
    if (max === undefined || cats.length <= max) {
      return 0;
    }
    return cats.length - max;
  });

  readonly overflowTooltip = computed(() => {
    const cats = this.categories();
    const max = this.maxVisible();
    if (max === undefined || cats.length <= max) {
      return '';
    }
    return cats.slice(max).join(', ');
  });
}
