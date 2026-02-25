import { Component, input, output, signal, effect, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { SelectOption } from '../../../../core/models/index.js';

// Re-export for convenience
export type { SelectOption };

/**
 * SearchableSelectComponent - Single-select dropdown with search/filter capability
 *
 * Features:
 * - Searchable options with text filter (built-in PrimeNG)
 * - Optional "All" option to clear selection
 * - Loading state indicator
 * - Accessible with proper ARIA labels
 * - Supports disabled state
 * - Styled with Tailwind CSS (unstyled PrimeNG)
 */
@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule, Select],
  template: `
    <div class="searchable-select-container">
      <label [for]="inputId()" class="searchable-select-label">
        {{ label() }}
      </label>

      <p-select
        [options]="options()"
        [ngModel]="internalValue()"
        [disabled]="disabled() || loading()"
        [filter]="true"
        [filterBy]="'name'"
        [placeholder]="placeholder()"
        [showClear]="hasValue()"
        [inputId]="inputId()"
        [ariaLabel]="label()"
        optionLabel="name"
        optionValue="name"
        emptyMessage="No results found"
        emptyFilterMessage="No results found"
        (ngModelChange)="onSelectionChange($event)"
      >
        <ng-template pTemplate="dropdownicon">
          @if (loading()) {
            <span class="searchable-select-spinner">
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
      </p-select>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .searchable-select-container {
        width: 100%;
      }

      .searchable-select-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #f1f5f9; /* slate-100 */
        margin-bottom: 0.5rem;
      }

      [data-theme='light'] .searchable-select-label {
        color: #64748b; /* slate-600 */
      }

      /* PrimeNG Select base styles (unstyled mode) */
      :host ::ng-deep .p-select {
        display: flex;
        align-items: center;
        position: relative;
        width: 100%;
        height: 41px;
        min-height: 41px;
        padding: 0 2.5rem 0 0.75rem;
        font-size: 0.875rem;
        color: #f1f5f9; /* slate-100 */
        background-color: #0f172a; /* slate-900 */
        border: 1px solid #1e293b; /* slate-800 */
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      [data-theme='light'] :host ::ng-deep .p-select {
        color: #0f172a; /* slate-900 */
        background-color: #f8fafc; /* slate-50 */
        border-color: #e2e8f0; /* slate-200 */
      }

      :host ::ng-deep .p-select:hover:not(.p-disabled) {
        border-color: #1e293b; /* slate-800 slightly lighter */
      }

      [data-theme='light'] :host ::ng-deep .p-select:hover:not(.p-disabled) {
        border-color: #cbd5e1; /* slate-300 */
      }

      :host ::ng-deep .p-select:focus-visible,
      :host ::ng-deep .p-select.p-focus {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
        border-color: #17a1cf;
      }

      :host ::ng-deep .p-select.p-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Dropdown trigger icon container */
      :host ::ng-deep .p-select-dropdown {
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

      :host ::ng-deep .p-select-dropdown .material-symbols-outlined {
        font-size: 1.5rem;
      }

      /* Loading spinner */
      .searchable-select-spinner {
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

      /* Selected value label */
      :host ::ng-deep .p-select-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: inherit; /* Inherit from .p-select */
      }

      /* Placeholder state */
      :host ::ng-deep .p-select-label.p-placeholder {
        color: #64748b; /* slate-500 - dark mode */
      }

      [data-theme='light'] :host ::ng-deep .p-select-label.p-placeholder {
        color: #94a3b8; /* slate-400 - light mode */
      }

      /* Selected value (not placeholder) - explicit color for light mode */
      [data-theme='light'] :host ::ng-deep .p-select-label:not(.p-placeholder) {
        color: #0f172a !important; /* slate-900 - ensure visibility */
      }

      /* Clear icon */
      :host ::ng-deep .p-select-clear-icon {
        margin-right: 0.5rem;
        color: #94a3b8; /* slate-400 */
        cursor: pointer;
      }

      :host ::ng-deep .p-select-clear-icon:hover {
        color: #f1f5f9; /* slate-100 */
      }

      /* Overlay panel */
      :host ::ng-deep .p-select-overlay {
        background-color: #1e293b; /* slate-800 */
        border: 1px solid #334155; /* slate-700 */
        border-radius: 0.375rem;
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.3),
          0 4px 6px -4px rgba(0, 0, 0, 0.2);
        margin-top: 0.25rem;
        overflow: hidden;
      }

      [data-theme='light'] :host ::ng-deep .p-select-overlay {
        background-color: #ffffff;
        border-color: #e2e8f0; /* slate-200 */
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -4px rgba(0, 0, 0, 0.1);
      }

      /* Filter input container */
      :host ::ng-deep .p-select-filter-container {
        padding: 0.75rem;
        border-bottom: 1px solid #334155; /* slate-700 */
      }

      [data-theme='light'] :host ::ng-deep .p-select-filter-container {
        border-bottom-color: #e2e8f0; /* slate-200 */
      }

      /* Filter input */
      :host ::ng-deep .p-select-filter {
        width: 100%;
        padding: 0.5rem 0.75rem 0.5rem 2.25rem;
        font-size: 0.875rem;
        color: #f1f5f9; /* slate-100 */
        background-color: #334155; /* slate-700 */
        border: 1px solid #475569; /* slate-600 */
        border-radius: 0.375rem;
        outline: none;
        transition: all 0.15s ease;
      }

      [data-theme='light'] :host ::ng-deep .p-select-filter {
        color: #0f172a; /* slate-900 */
        background-color: #f8fafc; /* slate-50 */
        border-color: #e2e8f0; /* slate-200 */
      }

      :host ::ng-deep .p-select-filter:focus {
        border-color: #17a1cf; /* primary */
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
      }

      /* Filter icon */
      :host ::ng-deep .p-select-filter-icon {
        position: absolute;
        left: 1.5rem;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8; /* slate-400 */
      }

      /* Options list */
      :host ::ng-deep .p-select-list-container {
        max-height: 300px;
        overflow-y: auto;
      }

      :host ::ng-deep .p-select-list {
        padding: 0.25rem;
        list-style: none;
        margin: 0;
      }

      /* Individual option */
      :host ::ng-deep .p-select-option {
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
        color: #e2e8f0; /* slate-200 */
        cursor: pointer;
        border-radius: 0.25rem;
        transition: background-color 0.15s ease;
      }

      [data-theme='light'] :host ::ng-deep .p-select-option {
        color: #0f172a; /* slate-900 */
      }

      :host ::ng-deep .p-select-option:hover {
        background-color: #334155; /* slate-700 */
      }

      [data-theme='light'] :host ::ng-deep .p-select-option:hover {
        background-color: #f1f5f9; /* slate-100 */
      }

      :host ::ng-deep .p-select-option.p-select-option-selected,
      :host ::ng-deep .p-select-option.p-focus {
        background-color: rgba(23, 161, 207, 0.1);
        color: #17a1cf; /* primary */
        font-weight: 500;
      }

      /* Empty message */
      :host ::ng-deep .p-select-empty-message {
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
export class SearchableSelectComponent {
  // Inputs
  readonly label = input<string>('Select');
  readonly placeholder = input<string>('');
  readonly options = input<SelectOption[]>([]);
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly showAllOption = input<boolean>(true);

  // Outputs
  readonly valueChange = output<string>();

  // Internal state
  readonly internalValue = signal<string>('');
  readonly inputId = signal<string>(`searchable-select-${Math.random().toString(36).substr(2, 9)}`);

  // Computed - show clear button only when there's a value
  readonly hasValue = computed(() => {
    const value = this.internalValue();
    return value !== '' && value !== null && value !== undefined;
  });

  constructor() {
    // Sync external value to internal
    effect(() => {
      this.internalValue.set(this.value());
    });
  }

  onSelectionChange(value: string | null): void {
    // PrimeNG returns null when clear is clicked
    const newValue = value ?? '';
    this.internalValue.set(newValue);
    this.valueChange.emit(newValue);
  }
}
