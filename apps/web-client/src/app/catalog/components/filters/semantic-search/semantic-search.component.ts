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
 * SemanticSearchComponent - Textarea for semantic/natural language search
 *
 * Features:
 * - Multi-line textarea for natural language queries
 * - Configurable label, placeholder, and hint text
 * - Debounced value emission (default 300ms)
 * - Optional character count with maxLength
 * - Clear button when input has value
 * - Accessible with proper ARIA labels
 * - Supports disabled state
 */
@Component({
  selector: 'app-semantic-search',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="semantic-search" [class.semantic-search--disabled]="disabled()">
      <div class="semantic-search__wrapper">
        <textarea
          id="semantic-search-textarea"
          class="textarea-semantic"
          [placeholder]="placeholder()"
          [value]="internalValue()"
          [disabled]="disabled()"
          aria-label="Semantic search"
          [attr.maxlength]="maxLength() || null"
          (input)="onInput($event)"
        ></textarea>
        @if (showClearButton()) {
          <button
            type="button"
            class="btn-clear clear-top-right"
            data-testid="clear-button"
            aria-label="Clear search"
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

      .semantic-search {
        width: 100%;
      }

      .semantic-search__wrapper {
        position: relative;
      }

      .textarea-semantic {
        width: 100%;
        height: 105px;
        padding: 0.75rem;
        padding-right: 2.5rem; /* Space for clear button */
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--color-text-primary);
        background-color: var(--color-bg-input);
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        transition: all 0.15s ease-in-out;
        resize: none;
      }

      .textarea-semantic::placeholder {
        color: var(--color-text-muted);
      }

      .textarea-semantic:hover:not(:disabled) {
        border-color: var(--color-border-strong);
      }

      .textarea-semantic:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
      }

      .textarea-semantic:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: var(--color-bg-input);
      }

      /* Clear button - positioned absolutely inside textarea wrapper */
      .btn-clear {
        position: absolute;
        right: 0.5rem;
        top: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        color: var(--color-text-muted);
        background-color: transparent;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        z-index: 2;
      }

      .btn-clear:hover {
        color: var(--color-text-primary);
        background-color: var(--color-bg-elevated);
      }

      .btn-clear:active {
        background-color: var(--color-bg-elevated);
        opacity: 0.8;
      }

      .btn-clear:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }

      .clear-top-right {
        top: 0.5rem;
        transform: none;
      }

      .semantic-search--disabled .textarea-semantic {
        opacity: 0.5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SemanticSearchComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly inputSubject = new Subject<string>();

  // Inputs
  readonly label = input<string>('Búsqueda Semántica');
  readonly placeholder = input<string>('Describe lo que estás buscando...');
  readonly hint = input<string>('');
  readonly value = input<string>('');
  readonly debounceMs = input<number>(300);
  readonly disabled = input<boolean>(false);
  readonly rows = input<number>(3);
  readonly maxLength = input<number>(0);

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
    const target = event.target as HTMLTextAreaElement;
    this.internalValue.set(target.value);
    this.inputSubject.next(target.value);
  }

  onClear(): void {
    this.internalValue.set('');
    this.valueChange.emit('');
  }
}
