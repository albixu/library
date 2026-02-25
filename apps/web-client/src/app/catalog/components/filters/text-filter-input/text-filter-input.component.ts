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
        width: 100%;
      }

      /* Override input-base to ensure correct background and dimensions */
      .input-wrapper .input-base {
        width: 100%;
        height: 41px;
        min-height: 41px;
        background-color: var(--color-bg-input) !important;
        border: 1px solid var(--color-border) !important;
        color: var(--color-text-primary);
      }

      .input-wrapper .input-base:hover:not(:disabled) {
        border-color: var(--color-border-strong) !important;
      }

      .input-wrapper .input-base:focus {
        background-color: var(--color-bg-input) !important;
        border-color: var(--color-accent) !important;
        outline: none !important;
        box-shadow: none !important; /* Remove ring shadow */
      }

      .input-wrapper .input-base:disabled {
        background-color: var(--color-bg-input) !important;
        opacity: 0.5;
      }

      .input-wrapper .input-base::placeholder {
        color: var(--color-text-muted);
      }

      .input-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.125rem; /* 18px icon size */
        color: var(--color-text-muted);
        pointer-events: none;
        z-index: 1;
      }

      .input-with-icons {
        padding-left: 2.5rem !important; /* 40px for left icon */
        padding-right: 2.5rem !important; /* 40px for clear button on right */
      }

      /* Clear button - needs to override global .btn-clear due to encapsulation */
      .btn-clear {
        position: absolute;
        right: 0.5rem; /* 8px from right */
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem; /* 32px */
        height: 2rem; /* 32px */
        padding: 0.25rem;
        border-radius: 0.375rem; /* 6px */
        background-color: transparent;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        transition: all 150ms ease-in-out;
        z-index: 2;
      }

      .btn-clear:hover {
        background-color: var(--color-bg-elevated);
        color: var(--color-text-primary);
      }

      .btn-clear .material-symbols-outlined {
        font-size: 1.125rem; /* 18px */
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
