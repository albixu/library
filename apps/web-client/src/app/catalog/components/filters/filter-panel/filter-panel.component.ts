import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TextFilterInputComponent } from '../text-filter-input/index.js';
import { SearchableSelectComponent } from '../searchable-select/index.js';
import { MultiSelectChipsComponent } from '../multi-select-chips/index.js';
import { SemanticSearchComponent } from '../semantic-search/index.js';
import { SearchFilters, SelectOption } from '../../../../core/models/index.js';

// Re-export for convenience
export type { SearchFilters, SelectOption };

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
  favorites: boolean;
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
  favorites: false,
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
    FormsModule,
  ],
  template: `
    <div
      class="filter-panel"
      role="region"
      aria-label="Filtros de búsqueda de libros"
      data-testid="filter-panel"
    >
      <div class="filter-panel__header">
        <h2 class="filter-panel__title">Filtros Avanzados</h2>
        <button
          type="button"
          data-testid="clear-filters-button"
          class="clear-filters-btn"
          [disabled]="disabled() || !hasActiveFilters()"
          aria-label="Limpiar todos los filtros"
          (click)="clearFilters()"
        >
          <span class="material-symbols-outlined">clear_all</span>
          <span>Limpiar filtros</span>
        </button>
      </div>

      <div class="filter-panel__divider"></div>

      <div class="filter-panel__content">
        <!-- Text filters section -->
        <section class="filter-section">
          <h3 class="filter-section__title">Buscar por texto</h3>

          <div data-testid="isbn-filter">
            <app-text-filter-input
              label="ISBN"
              icon="qr_code"
              placeholder="ej., 978-0-13-468599-1"
              [value]="currentFilters().isbn"
              [disabled]="disabled()"
              (valueChange)="onIsbnChange($event)"
            />
          </div>

          <div data-testid="title-filter">
            <app-text-filter-input
              label="Título"
              icon="book"
              placeholder="Buscar por título..."
              [value]="currentFilters().title"
              [disabled]="disabled()"
              (valueChange)="onTitleChange($event)"
            />
          </div>

          <div data-testid="author-filter">
            <app-text-filter-input
              label="Autor"
              icon="person"
              placeholder="Buscar por autor..."
              [value]="currentFilters().author"
              [disabled]="disabled()"
              (valueChange)="onAuthorChange($event)"
            />
          </div>
        </section>

        <div class="filter-panel__divider"></div>

        <!-- Classification filters section -->
        <section class="filter-section">
          <h3 class="filter-section__title">Clasificación</h3>

          <div data-testid="type-filter">
            <app-searchable-select
              label="Tipo"
              placeholder="Seleccionar un tipo..."
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
              label="Categorías"
              placeholder="Seleccionar categorías..."
              [options]="categories()"
              [value]="currentFilters().categories"
              [disabled]="disabled() || !currentFilters().type"
              [loading]="categoriesLoading()"
              (valueChange)="onCategoriesChange($event)"
            />
          </div>

          <div data-testid="levels-filter">
            <app-multi-select-chips
              label="Niveles"
              placeholder="Seleccionar niveles..."
              [options]="levels()"
              [value]="currentFilters().levels"
              [disabled]="disabled() || !currentFilters().type"
              [loading]="levelsLoading()"
              (valueChange)="onLevelsChange($event)"
            />
          </div>
        </section>

        <div class="filter-panel__divider"></div>

        <!-- Semantic search section -->
        <section class="filter-section">
          <h3 class="filter-section__title">Búsqueda semántica</h3>

          <div data-testid="semantic-search-filter">
            <app-semantic-search
              placeholder="Describe los libros que quieres encontrar..."
              [value]="currentFilters().text"
              [disabled]="disabled()"
              (valueChange)="onSemanticSearchChange($event)"
            />
          </div>
        </section>

        @if (isAuthenticated()) {
          <div class="filter-panel__divider"></div>

          <!-- Favorites section -->
          <section class="filter-section">
            <h3 class="filter-section__title">Mi biblioteca</h3>

            <label class="favorites-checkbox-label" data-testid="favorites-filter">
              <input
                type="checkbox"
                class="favorites-checkbox"
                [checked]="currentFilters().favorites"
                [disabled]="disabled()"
                (change)="onFavoritesChange($event)"
              />
              <span class="material-symbols-outlined favorites-icon">favorite</span>
              <span>Mis favoritos</span>
            </label>
          </section>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .filter-panel {
        padding: 1.5rem;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow: hidden;
      }

      .filter-panel__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .filter-panel__title {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgb(148 163 184);
      }

      .clear-filters-btn {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: rgb(148 163 184);
        background: transparent;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        transition:
          background-color 150ms,
          color 150ms;
      }

      .clear-filters-btn:hover:not(:disabled) {
        background-color: rgb(51 65 85);
        color: #17a1cf;
      }

      .clear-filters-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .clear-filters-btn .material-symbols-outlined {
        font-size: 1rem;
      }

      .filter-panel__divider {
        height: 1px;
        background-color: rgb(51 65 85);
        flex-shrink: 0;
      }

      .filter-panel__content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-y: auto;
        flex: 1;
        padding-right: 0.5rem;
      }

      .filter-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      .filter-section__title {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgb(148 163 184);
      }

      .favorites-checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        color: rgb(148 163 184);
        user-select: none;

        &:has(input:disabled) {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }

      .favorites-checkbox {
        accent-color: #17a1cf;
        width: 1rem;
        height: 1rem;
        cursor: pointer;
      }

      .favorites-icon {
        font-size: 1rem;
        color: #e11d48;
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
  readonly isAuthenticated = input<boolean>(false);

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
      filters.text !== '' ||
      filters.favorites
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
          favorites: externalValue.favorites ?? false,
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

  onFavoritesChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.updateFilters({ favorites: checked });
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
    if (state.favorites) filters.favorites = true;

    return filters;
  }
}
