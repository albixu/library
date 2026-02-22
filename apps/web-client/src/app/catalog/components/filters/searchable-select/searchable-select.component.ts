import { Component, input, output, signal, computed, effect, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Option interface for select items
 */
export interface SelectOption {
  id: string;
  name: string;
}

/**
 * SearchableSelectComponent - Single-select dropdown with search/filter capability
 *
 * Features:
 * - Searchable options with text filter
 * - Optional "All" option to clear selection
 * - Loading state indicator
 * - Accessible with proper ARIA labels
 * - Supports disabled state
 */
@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="searchable-select">
      <mat-label>{{ label() }}</mat-label>
      @if (loading()) {
        <mat-spinner diameter="20" matSuffix></mat-spinner>
      }
      <mat-select
        [value]="internalValue()"
        [disabled]="disabled() || loading()"
        [attr.aria-label]="label()"
        [placeholder]="placeholder()"
        (selectionChange)="onSelectionChange($event.value)"
        (openedChange)="onOpenedChange($event)"
        #selectRef
      >
        <!-- Search input inside panel -->
        <div class="search-container">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input
              matInput
              data-testid="search-input"
              [placeholder]="searchPlaceholder()"
              [value]="searchTerm()"
              (input)="onSearchInput($event)"
              (keydown)="onSearchKeydown($event)"
            />
          </mat-form-field>
        </div>

        @if (showAllOption()) {
          <mat-option value="">All</mat-option>
        }

        @for (option of filteredOptions(); track option.id) {
          <mat-option [value]="option.id">{{ option.name }}</mat-option>
        }

        @if (filteredOptions().length === 0 && searchTerm().length > 0) {
          <div class="no-results" data-testid="no-results">
            <mat-icon>search_off</mat-icon>
            <span>No results found</span>
          </div>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .searchable-select {
        width: 100%;
      }

      .search-container {
        padding: 8px;
        position: sticky;
        top: 0;
        background: var(--mat-select-panel-background-color);
        z-index: 1;
      }

      .search-field {
        width: 100%;

        ::ng-deep .mat-mdc-form-field-subscript-wrapper {
          display: none;
        }
      }

      .no-results {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px;
        color: var(--mat-option-label-text-color);
        opacity: 0.6;
      }

      mat-spinner {
        margin-right: 8px;
      }
    `,
  ],
})
export class SearchableSelectComponent {
  @ViewChild('selectRef') selectRef!: MatSelect;

  // Inputs
  readonly label = input<string>('Select');
  readonly placeholder = input<string>('');
  readonly searchPlaceholder = input<string>('Search...');
  readonly options = input<SelectOption[]>([]);
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly showAllOption = input<boolean>(true);

  // Outputs
  readonly valueChange = output<string>();

  // Internal state
  readonly internalValue = signal<string>('');
  readonly searchTerm = signal<string>('');

  // Computed
  readonly filteredOptions = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const allOptions = this.options();

    if (!term) {
      return allOptions;
    }

    return allOptions.filter((option) => option.name.toLowerCase().includes(term));
  });

  constructor() {
    // Sync external value to internal
    effect(() => {
      this.internalValue.set(this.value());
    });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    // Prevent select from handling these keys while typing
    if (event.key === ' ') {
      event.stopPropagation();
    }
  }

  onSelectionChange(value: string): void {
    this.internalValue.set(value);
    this.valueChange.emit(value);
  }

  onOpenedChange(isOpen: boolean): void {
    if (!isOpen) {
      // Clear search when panel closes
      this.searchTerm.set('');
    }
  }
}
