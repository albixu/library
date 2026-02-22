import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-category-chips',
  standalone: true,
  imports: [MatTooltipModule],
  template: `
    @if (categories().length > 0) {
      <div class="category-chips-container" role="list" aria-label="Categories">
        @for (category of visibleCategories(); track category) {
          <span class="category-chip" role="listitem">{{ category }}</span>
        }
        @if (overflowCount() > 0) {
          <span
            class="overflow-indicator"
            [title]="overflowTooltip()"
            role="listitem"
            aria-label="{{ overflowCount() }} more categories"
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
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
      background-color: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      white-space: nowrap;
    }

    .overflow-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      background-color: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface-variant);
      cursor: help;
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
