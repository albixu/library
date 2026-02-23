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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  template: `
    <mat-form-field appearance="outline" class="semantic-search">
      <mat-label>{{ label() }}</mat-label>
      <textarea
        matInput
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
          matSuffix
          mat-icon-button
          data-testid="clear-button"
          aria-label="Clear search"
          (click)="onClear()"
        >
          <mat-icon>close</mat-icon>
        </button>
      }
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      @if (maxLength() > 0) {
        <mat-hint align="end" data-testid="char-count">
          {{ internalValue().length }} / {{ maxLength() }}
        </mat-hint>
      }
    </mat-form-field>
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

      textarea {
        resize: vertical;
        min-height: 60px;
      }

      button[matSuffix] {
        margin-top: -40px;
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
