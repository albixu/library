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
import { MultiSelect } from 'primeng/multiselect';
import { SelectOption } from '../../../../core/models/index.js';

// Re-export for convenience
export type { SelectOption };

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
 * - Styled with Tailwind CSS (unstyled PrimeNG)
 */
@Component({
  selector: 'app-multi-select-chips',
  standalone: true,
  imports: [FormsModule, MultiSelect],
  template: `
    <div class="multi-select-chips-container">
      <!-- Selected chips -->
      @if (selectedOptions().length > 0) {
        <div class="chips-wrapper">
          @for (option of selectedOptions(); track option.id) {
            <span class="chip" data-testid="selected-chip">
              {{ option.name }}
              @if (!disabled()) {
                <button
                  type="button"
                  class="chip-remove"
                  data-testid="remove-chip"
                  [attr.aria-label]="'Remove ' + option.name"
                  (click)="removeOption(option.name)"
                >
                  <span class="material-symbols-outlined">close</span>
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
      <div class="multi-select-field">
        <label [for]="inputId()" class="multi-select-label">
          {{ label() }}
        </label>

        <p-multiselect
          [options]="options()"
          [ngModel]="internalValue()"
          [disabled]="disabled() || loading()"
          [filter]="true"
          [filterBy]="'name'"
          [placeholder]="displayPlaceholder()"
          [inputId]="inputId()"
          [ariaLabel]="label()"
          optionLabel="name"
          optionValue="name"
          emptyMessage="No results found"
          emptyFilterMessage="No results found"
          display="chip"
          [showToggleAll]="false"
          [appendTo]="'body'"
          (ngModelChange)="onSelectionChange($event)"
        >
          <ng-template pTemplate="dropdownicon">
            @if (loading()) {
              <span class="multi-select-spinner">
                <svg class="spinner-icon" viewBox="0 0 24 24">
                  <circle
                    class="spinner-circle"
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke-width="3"
                  ></circle>
                </svg>
              </span>
            } @else {
              <span class="material-symbols-outlined">arrow_drop_down</span>
            }
          </ng-template>
        </p-multiselect>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .multi-select-chips-container {
        width: 100%;
      }

      /* Custom chips display (above the select) */
      .chips-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        align-items: center;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.375rem 0.625rem;
        border-radius: 1rem;
        font-size: 0.8125rem;
        font-weight: 500;
        background-color: rgba(23, 161, 207, 0.15); /* primary with opacity */
        color: #17a1cf; /* primary */
        border: 1px solid rgba(23, 161, 207, 0.3);
        transition: all 0.15s ease;
      }

      .chip:hover {
        background-color: rgba(23, 161, 207, 0.25);
      }

      .chip-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.125rem;
        height: 1.125rem;
        border: none;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
        padding: 0;
        color: currentColor;
        transition: background-color 0.15s ease;
      }

      .chip-remove .material-symbols-outlined {
        font-size: 0.875rem;
      }

      .chip-remove:hover {
        background-color: rgba(23, 161, 207, 0.2);
      }

      .clear-all-btn {
        font-size: 0.75rem;
        font-weight: 500;
        color: #94a3b8; /* slate-400 */
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.375rem 0.625rem;
        border-radius: 0.25rem;
        transition: all 0.15s ease;
      }

      .clear-all-btn:hover {
        color: #f1f5f9; /* slate-100 */
        background-color: #334155; /* slate-700 */
      }

      /* Select field */
      .multi-select-field {
        width: 100%;
      }

      .multi-select-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #f1f5f9; /* slate-100 */
        margin-bottom: 0.5rem;
      }

      /* PrimeNG MultiSelect base styles (unstyled mode) */
      :host ::ng-deep .p-multiselect {
        display: flex;
        align-items: center;
        position: relative;
        width: 100%;
        min-height: 2.75rem;
        padding: 0.625rem 2.5rem 0.625rem 0.875rem;
        font-size: 0.875rem;
        color: #f1f5f9; /* slate-100 */
        background-color: #1e293b; /* slate-800 */
        border: 1px solid #334155; /* slate-700 */
        border-radius: 0.375rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      :host ::ng-deep .p-multiselect:hover:not(.p-disabled) {
        border-color: #17a1cf; /* primary */
        background-color: #334155; /* slate-700 */
      }

      :host ::ng-deep .p-multiselect:focus-visible,
      :host ::ng-deep .p-multiselect.p-focus {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
        border-color: #17a1cf;
      }

      :host ::ng-deep .p-multiselect.p-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* PrimeNG's label container - show when no selections */
      :host ::ng-deep .p-multiselect-label-container {
        flex: 1;
        overflow: hidden;
      }

      /* Hide chips when we have custom display above */
      :host ::ng-deep .p-multiselect-label-container .p-multiselect-chip {
        display: none;
      }

      /* Dropdown trigger icon container */
      :host ::ng-deep .p-multiselect-dropdown {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8; /* slate-400 */
        pointer-events: none;
      }

      :host ::ng-deep .p-multiselect-dropdown .material-symbols-outlined {
        font-size: 1.5rem;
      }

      /* Loading spinner */
      .multi-select-spinner {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .spinner-icon {
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
      }

      .spinner-circle {
        stroke: #17a1cf; /* primary */
        stroke-linecap: round;
        stroke-dasharray: 50, 200;
        stroke-dashoffset: 0;
        animation: dash 1.5s ease-in-out infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes dash {
        0% {
          stroke-dasharray: 1, 200;
          stroke-dashoffset: 0;
        }
        50% {
          stroke-dasharray: 100, 200;
          stroke-dashoffset: -15;
        }
        100% {
          stroke-dasharray: 100, 200;
          stroke-dashoffset: -125;
        }
      }

      /* Label when nothing selected */
      :host ::ng-deep .p-multiselect-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      :host ::ng-deep .p-multiselect-label.p-placeholder {
        color: #64748b; /* slate-500 */
      }

      /* Overlay panel */
      :host ::ng-deep .p-multiselect-overlay {
        position: fixed !important;
        z-index: 1000;
        background-color: #1e293b; /* slate-800 */
        border: 1px solid #334155; /* slate-700 */
        border-radius: 0.375rem;
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.3),
          0 4px 6px -4px rgba(0, 0, 0, 0.2);
        margin-top: 0.25rem;
        overflow: hidden;
        pointer-events: auto;
      }

      /* Filter input container */
      :host ::ng-deep .p-multiselect-filter-container {
        position: relative;
        padding: 0.75rem;
        border-bottom: 1px solid #334155; /* slate-700 */
        background-color: #1e293b; /* slate-800 */
      }

      /* Filter input wrapper */
      :host ::ng-deep .p-multiselect-filter {
        width: 100%;
        padding: 0.5rem 0.75rem;
        padding-left: 2.25rem;
        font-size: 0.875rem;
        color: #f1f5f9; /* slate-100 */
        background-color: #0f172a; /* slate-900 */
        border: 1px solid #334155; /* slate-700 */
        border-radius: 0.375rem;
        outline: none;
        transition: all 0.15s ease;
      }

      :host ::ng-deep .p-multiselect-filter::placeholder {
        color: #64748b; /* slate-500 */
      }

      :host ::ng-deep .p-multiselect-filter:focus {
        border-color: #17a1cf; /* primary */
        background-color: #1e293b; /* slate-800 */
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
      }

      /* Filter icon */
      :host ::ng-deep .p-multiselect-filter-icon {
        position: absolute;
        left: 1.5rem;
        top: 50%;
        transform: translateY(-50%);
        color: #64748b; /* slate-500 */
        font-size: 1rem;
        pointer-events: none;
      }

      /* Options list */
      :host ::ng-deep .p-multiselect-list-container {
        max-height: 300px;
        overflow-y: auto;
        background-color: #1e293b; /* slate-800 */
      }

      :host ::ng-deep .p-multiselect-list {
        padding: 0.25rem;
        list-style: none;
        margin: 0;
      }

      /* Individual option */
      :host ::ng-deep .p-multiselect-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
        color: #e2e8f0; /* slate-200 */
        cursor: pointer;
        border-radius: 0.25rem;
        transition: all 0.15s ease;
        user-select: none;
      }

      :host ::ng-deep .p-multiselect-option:hover {
        background-color: #334155; /* slate-700 */
      }

      :host ::ng-deep .p-multiselect-option.p-multiselect-option-selected {
        background-color: rgba(23, 161, 207, 0.15);
        color: #17a1cf; /* primary */
        font-weight: 500;
      }

      :host ::ng-deep .p-multiselect-option.p-focus {
        background-color: #334155; /* slate-700 */
      }

      :host ::ng-deep .p-multiselect-option.p-multiselect-option-selected.p-focus {
        background-color: rgba(23, 161, 207, 0.25);
      }

      /* Checkbox in options */
      :host ::ng-deep .p-multiselect-option .p-checkbox {
        width: 1.125rem;
        height: 1.125rem;
        border: 2px solid #475569; /* slate-600 */
        border-radius: 0.25rem;
        background-color: #1e293b; /* slate-800 */
        transition: all 0.15s ease;
      }

      :host ::ng-deep .p-multiselect-option:hover .p-checkbox {
        border-color: #17a1cf; /* primary */
      }

      :host ::ng-deep .p-multiselect-option.p-multiselect-option-selected .p-checkbox {
        background-color: #17a1cf; /* primary */
        border-color: #17a1cf;
      }

      :host ::ng-deep .p-multiselect-option .p-checkbox-icon {
        color: #1e293b; /* slate-800 - checkmark color */
        font-size: 0.75rem;
      }

      /* Empty message */
      :host ::ng-deep .p-multiselect-empty-message {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        font-size: 0.875rem;
        color: #94a3b8; /* slate-400 */
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiSelectChipsComponent {
  // Inputs
  readonly label = input<string>('Select');
  readonly placeholder = input<string>('');
  readonly options = input<SelectOption[]>([]);
  readonly value = input<string[]>([]);
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);

  // Outputs
  readonly valueChange = output<string[]>();

  // Internal state
  readonly internalValue = signal<string[]>([]);
  readonly inputId = signal<string>(`multi-select-${Math.random().toString(36).substr(2, 9)}`);

  // Computed
  readonly selectedOptions = computed(() => {
    const selectedNames = this.internalValue();
    const allOptions = this.options();
    return allOptions.filter((opt) => selectedNames.includes(opt.name));
  });

  readonly displayPlaceholder = computed(() => {
    const count = this.selectedOptions().length;
    if (count === 0) {
      return this.placeholder() || 'Select options...';
    }
    return `${count} selected`;
  });

  constructor() {
    // Sync external value to internal
    effect(() => {
      this.internalValue.set(this.value());
    });
  }

  onSelectionChange(value: string[] | null): void {
    // PrimeNG can return null
    const newValue = value ?? [];
    this.internalValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  removeOption(name: string): void {
    const newValue = this.internalValue().filter((v) => v !== name);
    this.internalValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  clearAll(): void {
    this.internalValue.set([]);
    this.valueChange.emit([]);
  }
}
