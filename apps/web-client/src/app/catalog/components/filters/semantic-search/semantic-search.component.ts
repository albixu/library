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
      <label class="semantic-search__label" for="semantic-search-textarea">{{ label() }}</label>
      <div class="semantic-search__wrapper">
        <textarea
          id="semantic-search-textarea"
          class="semantic-search__textarea"
          [placeholder]="placeholder()"
          [value]="internalValue()"
          [disabled]="disabled()"
          [attr.aria-label]="label()"
          [rows]="rows()"
          [attr.maxlength]="maxLength() || null"
          (input)="onInput($event)"
        ></textarea>
        @if (showClearButton()) {
          <button
            type="button"
            class="semantic-search__clear-button"
            data-testid="clear-button"
            aria-label="Clear search"
            (click)="onClear()"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        }
      </div>
      <div class="semantic-search__hints">
        @if (hint()) {
          <span class="semantic-search__hint">{{ hint() }}</span>
        }
        @if (maxLength() > 0) {
          <span class="semantic-search__char-count" data-testid="char-count">
            {{ internalValue().length }} / {{ maxLength() }}
          </span>
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

      .semantic-search__label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: rgb(148 163 184);
      }

      [data-theme='dark'] .semantic-search__label {
        color: rgb(148 163 184);
      }

      .semantic-search__wrapper {
        position: relative;
      }

      .semantic-search__textarea {
        width: 100%;
        padding: 0.75rem;
        padding-right: 2.75rem;
        font-size: 0.9375rem;
        border: 1px solid rgb(51 65 85);
        border-radius: 0.5rem;
        background-color: rgb(30 41 59);
        color: rgb(241 245 249);
        resize: vertical;
        min-height: 72px;
        transition:
          border-color 150ms,
          box-shadow 150ms;
      }

      .semantic-search__textarea::placeholder {
        color: rgb(100 116 139);
      }

      .semantic-search__textarea:focus {
        outline: none;
        border-color: #17a1cf;
        box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
      }

      .semantic-search__textarea:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: rgb(15 23 42);
      }

      [data-theme='light'] .semantic-search__textarea {
        background-color: rgb(255 255 255);
        color: rgb(30 41 59);
        border-color: rgb(226 232 240);
      }

      [data-theme='light'] .semantic-search__textarea::placeholder {
        color: rgb(148 163 184);
      }

      [data-theme='light'] .semantic-search__textarea:disabled {
        background-color: rgb(248 250 252);
      }

      .semantic-search__clear-button {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 2rem;
        height: 2rem;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: 0.375rem;
        color: rgb(148 163 184);
        cursor: pointer;
        transition:
          background-color 150ms,
          color 150ms;
      }

      .semantic-search__clear-button:hover {
        background-color: rgb(51 65 85);
        color: rgb(241 245 249);
      }

      [data-theme='light'] .semantic-search__clear-button {
        color: rgb(100 116 139);
      }

      [data-theme='light'] .semantic-search__clear-button:hover {
        background-color: rgb(241 245 249);
        color: rgb(30 41 59);
      }

      .semantic-search__clear-button .material-symbols-outlined {
        font-size: 1.25rem;
      }

      .semantic-search__hints {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.375rem;
        font-size: 0.75rem;
        color: rgb(148 163 184);
        min-height: 1rem;
      }

      .semantic-search__hint {
        flex: 1;
      }

      .semantic-search__char-count {
        flex-shrink: 0;
        margin-left: 0.5rem;
      }

      .semantic-search--disabled .semantic-search__label {
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
