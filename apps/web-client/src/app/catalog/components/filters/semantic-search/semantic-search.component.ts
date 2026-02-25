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
        color: #f1f5f9; /* slate-100 */
        background-color: #0f172a; /* slate-900 - Stitch exact color */
        border: 1px solid #1e293b; /* slate-800 - Stitch exact color */
        border-radius: 0.5rem;
        transition: all 0.15s ease-in-out;
        resize: none;
      }

      .textarea-semantic::placeholder {
        color: #64748b; /* slate-500 */
      }

      .textarea-semantic:hover:not(:disabled) {
        border-color: #334155; /* slate-700 */
      }

      .textarea-semantic:focus {
        outline: none;
        border-color: #17a1cf; /* primary */
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
      }

      .textarea-semantic:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #0f172a;
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
        color: #64748b; /* slate-500 */
        background-color: transparent;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        z-index: 2;
      }

      .btn-clear:hover {
        color: #f1f5f9; /* slate-100 */
        background-color: rgba(51, 65, 85, 0.5); /* slate-700 with opacity */
      }

      .btn-clear:active {
        background-color: rgba(51, 65, 85, 0.7);
      }

      .btn-clear:focus-visible {
        outline: 2px solid #17a1cf; /* primary */
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
  readonly label = input<string>('Semantic Search');
  readonly placeholder = input<string>('Describe what you are looking for...');
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
