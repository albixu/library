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
      <label class="label-filter" for="semantic-search-textarea">{{ label() }}</label>
      <div class="semantic-search__wrapper">
        <textarea
          id="semantic-search-textarea"
          class="textarea-base"
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
            class="btn-clear clear-top-right"
            data-testid="clear-button"
            aria-label="Clear search"
            (click)="onClear()"
          >
            <span class="material-symbols-outlined icon-sm">close</span>
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

      .semantic-search__wrapper {
        position: relative;
      }

      .clear-top-right {
        top: 0.5rem;
        transform: none;
      }

      .semantic-search__hints {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.375rem;
        font-size: 0.75rem;
        color: var(--slate-400);
        min-height: 1rem;
      }

      .semantic-search__hint {
        flex: 1;
      }

      .semantic-search__char-count {
        flex-shrink: 0;
        margin-left: 0.5rem;
      }

      .semantic-search--disabled .label-filter {
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
