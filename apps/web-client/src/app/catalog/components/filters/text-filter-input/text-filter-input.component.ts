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
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  template: `
    <mat-form-field appearance="outline" class="text-filter-input">
      <mat-label>{{ label() }}</mat-label>
      <mat-icon matPrefix>{{ icon() }}</mat-icon>
      <input
        matInput
        type="text"
        [placeholder]="placeholder()"
        [value]="internalValue()"
        [disabled]="disabled()"
        [attr.aria-label]="label()"
        (input)="onInput($event)"
      />
      @if (showClearButton()) {
        <button
          matSuffix
          mat-icon-button
          data-testid="clear-button"
          aria-label="Clear filter"
          (click)="onClear()"
        >
          <mat-icon>close</mat-icon>
        </button>
      }
    </mat-form-field>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .text-filter-input {
        width: 100%;

        // Style the input to match Stitch design
        ::ng-deep {
          .mdc-text-field--outlined {
            background-color: var(--color-bg-input);
            border-radius: var(--radius-md);

            .mdc-notched-outline__leading,
            .mdc-notched-outline__notch,
            .mdc-notched-outline__trailing {
              border-color: var(--color-border);
            }

            &:hover .mdc-notched-outline__leading,
            &:hover .mdc-notched-outline__notch,
            &:hover .mdc-notched-outline__trailing {
              border-color: var(--color-border-strong);
            }

            &.mdc-text-field--focused .mdc-notched-outline__leading,
            &.mdc-text-field--focused .mdc-notched-outline__notch,
            &.mdc-text-field--focused .mdc-notched-outline__trailing {
              border-color: var(--color-accent);
            }
          }

          .mat-mdc-form-field-subscript-wrapper {
            display: none;
          }

          input.mat-mdc-input-element {
            font-size: 0.875rem;
            color: var(--color-text-primary);

            &::placeholder {
              color: var(--color-text-muted);
            }
          }

          .mat-mdc-floating-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--color-text-secondary);
          }
        }
      }

      mat-icon[matPrefix] {
        margin-right: 8px;
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--color-text-muted);
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
