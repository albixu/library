import { Component, input, output, signal, computed, effect, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SelectOption } from '../../../../core/models/index.js';

// Re-export for convenience
export { SelectOption };

/**
 * MultiSelectChipsComponent - Multi-select dropdown that displays selections as chips
 *
 * Features:
 * - Multiple selection capability
 * - Displays selected items as chips with remove buttons
 * - Searchable options with text filter
 * - Clear all functionality
 * - Loading state indicator
 * - Accessible with proper ARIA labels
 * - Supports disabled state
 */
@Component({
  selector: 'app-multi-select-chips',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="multi-select-chips">
      <!-- Selected chips -->
      @if (selectedOptions().length > 0) {
        <div class="chips-container">
          @for (option of selectedOptions(); track option.id) {
            <span class="chip" data-testid="selected-chip">
              {{ option.name }}
              @if (!disabled()) {
                <button
                  type="button"
                  class="chip-remove"
                  data-testid="remove-chip"
                  [attr.aria-label]="'Remove ' + option.name"
                  (click)="removeOption(option.id)"
                >
                  <mat-icon>close</mat-icon>
                </button>
              }
            </span>
          }
          @if (!disabled() && selectedOptions().length > 1) {
            <button
              type="button"
              class="clear-all-btn"
              data-testid="clear-all"
              aria-label="Clear all selections"
              (click)="clearAll()"
            >
              Clear all
            </button>
          }
        </div>
      }

      <!-- Select field -->
      <mat-form-field appearance="outline" class="select-field">
        <mat-label>{{ label() }}</mat-label>
        @if (loading()) {
          <mat-spinner diameter="20" matSuffix></mat-spinner>
        }
        <mat-select
          multiple
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
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .multi-select-chips {
        width: 100%;
      }

      .chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
        align-items: center;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 16px;
        font-size: 13px;
        background-color: var(--mat-chip-elevated-container-color, rgba(0, 0, 0, 0.08));
        color: var(--mat-chip-label-text-color, inherit);
      }

      .chip-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border: none;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
        padding: 0;

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }

        &:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }
      }

      .clear-all-btn {
        font-size: 12px;
        color: var(--mat-text-secondary-color);
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 8px;

        &:hover {
          text-decoration: underline;
        }
      }

      .select-field {
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiSelectChipsComponent {
  @ViewChild('selectRef') selectRef!: MatSelect;

  // Inputs
  readonly label = input<string>('Select');
  readonly placeholder = input<string>('');
  readonly searchPlaceholder = input<string>('Search...');
  readonly options = input<SelectOption[]>([]);
  readonly value = input<string[]>([]);
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);

  // Outputs
  readonly valueChange = output<string[]>();

  // Internal state
  readonly internalValue = signal<string[]>([]);
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

  readonly selectedOptions = computed(() => {
    const selectedIds = this.internalValue();
    const allOptions = this.options();
    return allOptions.filter((opt) => selectedIds.includes(opt.id));
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

  onSelectionChange(value: string[]): void {
    this.internalValue.set(value);
    this.valueChange.emit(value);
  }

  onOpenedChange(isOpen: boolean): void {
    if (!isOpen) {
      // Clear search when panel closes
      this.searchTerm.set('');
    }
  }

  removeOption(id: string): void {
    const newValue = this.internalValue().filter((v) => v !== id);
    this.internalValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  clearAll(): void {
    this.internalValue.set([]);
    this.valueChange.emit([]);
  }
}
