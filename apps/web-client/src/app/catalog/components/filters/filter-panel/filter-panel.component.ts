import { Component, input, output, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';

import { TextFilterInputComponent } from '../text-filter-input/index.js';
import { SearchableSelectComponent } from '../searchable-select/index.js';
import { MultiSelectChipsComponent } from '../multi-select-chips/index.js';
import { SemanticSearchComponent } from '../semantic-search/index.js';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { SearchFilters, SelectOption } from '../../../../core/models/index.js';

// Re-export for convenience
export { SearchFilters, SelectOption };

/**
 * Internal filter state with all fields required for form handling
 */
interface FilterState {
  isbn: string;
  title: string;
  author: string;
  type: string;
  categories: string[];
  levels: string[];
  text: string;
}

/**
 * Default empty filters state
 */
const DEFAULT_FILTERS: FilterState = {
  isbn: '',
  title: '',
  author: '',
  type: '',
  categories: [],
  levels: [],
  text: '',
};

/**
 * FilterPanelComponent - Panel that integrates all filter components
 *
 * Features:
 * - Integrates text filters (ISBN, Title, Author)
 * - Type single-select with dependency logic
 * - Categories and Levels multi-select
 * - Semantic search textarea
 * - Clear all filters button
 * - When Type changes, Categories and Levels are cleared
 * - Emits filter changes for parent component to handle
 */
@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [
    TextFilterInputComponent,
    SearchableSelectComponent,
    MultiSelectChipsComponent,
    SemanticSearchComponent,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <div
      class="filter-panel"
      role="region"
      aria-label="Book search filters"
      data-testid="filter-panel"
    >
      <div class="filter-panel__header">
        <h2 class="filter-panel__title">Filters</h2>
        <button
          mat-button
          data-testid="clear-filters-button"
          class="clear-filters-btn"
          [disabled]="disabled() || !hasActiveFilters()"
          aria-label="Clear all filters"
          (click)="clearFilters()"
        >
          <mat-icon>clear_all</mat-icon>
          Clear filters
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="filter-panel__content">
        <!-- Text filters section -->
        <section class="filter-section">
          <h3 class="filter-section__title">Search by text</h3>

          <div data-testid="isbn-filter">
            <app-text-filter-input
              label="ISBN"
              icon="qr_code"
              placeholder="e.g., 978-0-13-468599-1"
              [value]="currentFilters().isbn"
              [disabled]="disabled()"
              (valueChange)="onIsbnChange($event)"
            />
          </div>

          <div data-testid="title-filter">
            <app-text-filter-input
              label="Title"
              icon="book"
              placeholder="Search by title..."
              [value]="currentFilters().title"
              [disabled]="disabled()"
              (valueChange)="onTitleChange($event)"
            />
          </div>

          <div data-testid="author-filter">
            <app-text-filter-input
              label="Author"
              icon="person"
              placeholder="Search by author..."
              [value]="currentFilters().author"
              [disabled]="disabled()"
              (valueChange)="onAuthorChange($event)"
            />
          </div>
        </section>

        <mat-divider></mat-divider>

        <!-- Classification filters section -->
        <section class="filter-section">
          <h3 class="filter-section__title">Classification</h3>

          <div data-testid="type-filter">
            <app-searchable-select
              label="Type"
              placeholder="Select a type..."
              [options]="types()"
              [value]="currentFilters().type"
              [disabled]="disabled()"
              [loading]="typesLoading()"
              [showAllOption]="true"
              (valueChange)="onTypeChange($event)"
            />
          </div>

          <div data-testid="categories-filter">
            <app-multi-select-chips
              label="Categories"
              placeholder="Select categories..."
              [options]="categories()"
              [value]="currentFilters().categories"
              [disabled]="disabled() || !currentFilters().type"
              [loading]="categoriesLoading()"
              (valueChange)="onCategoriesChange($event)"
            />
          </div>

          <div data-testid="levels-filter">
            <app-multi-select-chips
              label="Levels"
              placeholder="Select levels..."
              [options]="levels()"
              [value]="currentFilters().levels"
              [disabled]="disabled() || !currentFilters().type"
              [loading]="levelsLoading()"
              (valueChange)="onLevelsChange($event)"
            />
          </div>
        </section>

        <mat-divider></mat-divider>

        <!-- Semantic search section -->
        <section class="filter-section">
          <h3 class="filter-section__title">Semantic search</h3>

          <div data-testid="semantic-search-filter">
            <app-semantic-search
              label="What are you looking for?"
              placeholder="Describe the books you want to find..."
              hint="Use natural language for better results"
              [value]="currentFilters().text"
              [disabled]="disabled()"
              [rows]="3"
              [maxLength]="500"
              (valueChange)="onSemanticSearchChange($event)"
            />
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .filter-panel {
        padding: 16px;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .filter-panel__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .filter-panel__title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
      }

      .clear-filters-btn {
        font-size: 0.875rem;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 4px;
        }
      }

      .filter-panel__content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
        flex: 1;
      }

      .filter-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .filter-section__title {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--mat-text-secondary-color, rgba(0, 0, 0, 0.6));
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      mat-divider {
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterPanelComponent {
  // Option inputs
  readonly types = input<SelectOption[]>([]);
  readonly categories = input<SelectOption[]>([]);
  readonly levels = input<SelectOption[]>([]);

  // Loading state inputs
  readonly typesLoading = input<boolean>(false);
  readonly categoriesLoading = input<boolean>(false);
  readonly levelsLoading = input<boolean>(false);

  // General state inputs
  readonly disabled = input<boolean>(false);
  readonly value = input<SearchFilters | null>(null);

  // Outputs
  readonly filtersChange = output<SearchFilters>();
  readonly typeChange = output<string>();

  // Internal state (uses FilterState with required fields for form handling)
  readonly currentFilters = signal<FilterState>({ ...DEFAULT_FILTERS });

  // Track previous type to detect changes
  private previousType = '';

  // Computed
  readonly hasActiveFilters = computed(() => {
    const filters = this.currentFilters();
    return (
      filters.isbn !== '' ||
      filters.title !== '' ||
      filters.author !== '' ||
      filters.type !== '' ||
      filters.categories.length > 0 ||
      filters.levels.length > 0 ||
      filters.text !== ''
    );
  });

  constructor() {
    // Sync external value to internal
    effect(() => {
      const externalValue = this.value();
      if (externalValue) {
        // Merge with defaults to ensure all fields are present
        this.currentFilters.set({
          ...DEFAULT_FILTERS,
          ...externalValue,
          categories: externalValue.categories ?? [],
          levels: externalValue.levels ?? [],
        });
        this.previousType = externalValue.type ?? '';
      }
    });
  }

  // Handler methods
  onIsbnChange(isbn: string): void {
    this.updateFilters({ isbn });
  }

  onTitleChange(title: string): void {
    this.updateFilters({ title });
  }

  onAuthorChange(author: string): void {
    this.updateFilters({ author });
  }

  onTypeChange(type: string): void {
    // Only clear dependent filters if type actually changed
    if (type !== this.previousType) {
      this.updateFilters({
        type,
        categories: [],
        levels: [],
      });
      this.typeChange.emit(type);
      this.previousType = type;
    }
  }

  onCategoriesChange(categories: string[]): void {
    this.updateFilters({ categories });
  }

  onLevelsChange(levels: string[]): void {
    this.updateFilters({ levels });
  }

  onSemanticSearchChange(text: string): void {
    this.updateFilters({ text });
  }

  clearFilters(): void {
    this.currentFilters.set({ ...DEFAULT_FILTERS });
    this.previousType = '';
    this.typeChange.emit('');
    this.filtersChange.emit(this.toSearchFilters(DEFAULT_FILTERS));
  }

  // Private helpers
  private updateFilters(partial: Partial<FilterState>): void {
    const newFilters = {
      ...this.currentFilters(),
      ...partial,
    };
    this.currentFilters.set(newFilters);
    this.filtersChange.emit(this.toSearchFilters(newFilters));
  }

  /**
   * Convert internal FilterState to SearchFilters (only include non-empty values)
   */
  private toSearchFilters(state: FilterState): SearchFilters {
    const filters: SearchFilters = {};

    if (state.isbn) filters.isbn = state.isbn;
    if (state.title) filters.title = state.title;
    if (state.author) filters.author = state.author;
    if (state.type) filters.type = state.type;
    if (state.categories.length > 0) filters.categories = state.categories;
    if (state.levels.length > 0) filters.levels = state.levels;
    if (state.text) filters.text = state.text;

    return filters;
  }
}
