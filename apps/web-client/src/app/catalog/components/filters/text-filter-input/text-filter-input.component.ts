import {
  Component,
  input,
  output,
  signal,
  effect,
  computed,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';

/**
 * TextFilterInputComponent - Reusable text input for filtering with debounce
 *
 * Features:
 * - Configurable label, icon, and placeholder
 * - Debounced value emission (default 300ms)
 * - Clear button when input has value
 * - Accessible with proper ARIA labels
 * - Supports disabled state
 */
@Component({
  selector: 'app-text-filter-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="text-filter-input">
      <label class="filter-label" [attr.for]="'filter-' + label()">
        {{ label() }}
      </label>
      <div class="input-wrapper">
        <span class="material-symbols-outlined input-icon">{{ icon() }}</span>
        <input
          [id]="'filter-' + label()"
          type="text"
          class="filter-input"
          [placeholder]="placeholder()"
          [value]="internalValue()"
          [disabled]="disabled()"
          [attr.aria-label]="label()"
          (input)="onInput($event)"
        />
        @if (showClearButton()) {
          <button
            type="button"
            class="clear-button"
            data-testid="clear-button"
            aria-label="Clear filter"
            (click)="onClear()"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .text-filter-input {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
      }

      .filter-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #94a3b8; /* slate-400 */
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .input-icon {
        position: absolute;
        left: 0.75rem;
        font-size: 1.125rem;
        color: #64748b; /* slate-500 */
        pointer-events: none;
      }

      .filter-input {
        width: 100%;
        padding: 0.625rem 2.75rem 0.625rem 2.5rem;
        font-size: 0.875rem;
        color: #f1f5f9; /* slate-100 */
        background-color: #1e293b; /* slate-800 */
        border: 1px solid #334155; /* slate-700 */
        border-radius: 0.5rem;
        transition: all 0.15s ease;

        &::placeholder {
          color: #64748b; /* slate-500 */
        }

        &:hover:not(:disabled) {
          border-color: #475569; /* slate-600 */
        }

        &:focus {
          outline: none;
          border-color: #17a1cf; /* primary */
          box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .clear-button {
        position: absolute;
        right: 0.5rem;
        padding: 0.25rem;
        background: transparent;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b; /* slate-500 */
        transition: all 0.15s ease;

        &:hover {
          background-color: rgba(100, 116, 139, 0.1);
          color: #f1f5f9; /* slate-100 */
        }

        &:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .material-symbols-outlined {
          font-size: 1.125rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextFilterInputComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly inputSubject = new Subject<string>();

  // Inputs
  readonly label = input<string>('Filter');
  readonly icon = input<string>('filter_list');
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly debounceMs = input<number>(300);
  readonly disabled = input<boolean>(false);

  // Outputs
  readonly valueChange = output<string>();

  // Internal state
  readonly internalValue = signal<string>('');

  // Computed
  readonly showClearButton = computed(() => this.internalValue().length > 0 && !this.disabled());

  constructor() {
    // Sync external value to internal
    effect(() => {
      this.internalValue.set(this.value());
    });

    // Setup debounced emission using takeUntilDestroyed
    this.inputSubject
      .pipe(debounceTime(this.debounceMs()), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.valueChange.emit(value);
      });
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.internalValue.set(target.value);
    this.inputSubject.next(target.value);
  }

  onClear(): void {
    this.internalValue.set('');
    this.valueChange.emit('');
  }
}
