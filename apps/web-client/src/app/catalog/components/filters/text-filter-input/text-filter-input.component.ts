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
      <label class="label-filter" [attr.for]="'filter-' + label()">
        {{ label() }}
      </label>
      <div class="input-wrapper">
        <span class="material-symbols-outlined input-icon">{{ icon() }}</span>
        <input
          [id]="'filter-' + label()"
          type="text"
          class="input-base input-with-icons"
          [placeholder]="placeholder()"
          [value]="internalValue()"
          [disabled]="disabled()"
          [attr.aria-label]="label()"
          (input)="onInput($event)"
        />
        @if (showClearButton()) {
          <button
            type="button"
            class="btn-clear"
            data-testid="clear-button"
            aria-label="Clear filter"
            (click)="onClear()"
          >
            <span class="material-symbols-outlined icon-sm">close</span>
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

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      /* Override input-base to ensure correct background */
      .input-wrapper .input-base {
        background-color: #0f172a !important; /* slate-900 - same as semantic search */
        border: 1px solid #1e293b !important; /* slate-800 */
      }

      .input-wrapper .input-base:hover:not(:disabled) {
        border-color: #1e293b !important; /* slate-800 */
      }

      .input-wrapper .input-base:focus {
        background-color: #0f172a !important;
        border-color: #17a1cf !important; /* primary */
      }

      .input-wrapper .input-base:disabled {
        background-color: #0f172a !important;
        opacity: 0.5;
      }

      .input-icon {
        position: absolute;
        left: 0.75rem;
        font-size: 1.125rem;
        color: var(--slate-500);
        pointer-events: none;
        z-index: 1;
      }

      .input-with-icons {
        padding-left: 2.5rem;
        padding-right: 2.75rem;
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
