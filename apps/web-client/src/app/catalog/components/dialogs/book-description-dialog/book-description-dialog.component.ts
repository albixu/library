import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

/**
 * BookDescriptionDialogComponent - Modal dialog to display full book descriptions
 *
 * Features:
 * - Clean modal dialog with close button
 * - Responsive width
 * - Theme-aware styling (light/dark mode)
 * - Scrollable content for long descriptions
 */
@Component({
  selector: 'app-book-description-dialog',
  standalone: true,
  imports: [Dialog, ButtonModule],
  template: `
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '90vw', 'max-width': '600px' }"
      styleClass="book-description-dialog"
      (onHide)="onClose()"
    >
      <ng-template pTemplate="header">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ title() }}</h3>
        </div>
      </ng-template>

      <div class="dialog-content">
        <p class="description-text">{{ description() }}</p>
      </div>

      <ng-template pTemplate="footer">
        <button
          pButton
          type="button"
          label="Cerrar"
          aria-label="Cerrar"
          class="p-button-text"
          (click)="onClose()"
        ></button>
      </ng-template>
    </p-dialog>
  `,
  styles: `
    :host ::ng-deep {
      .book-description-dialog {
        .p-dialog-header {
          background-color: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          padding: 1.25rem 1.5rem;
        }

        .p-dialog-content {
          background-color: var(--color-bg-surface);
          color: var(--color-text-primary);
          padding: 1.5rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .p-dialog-footer {
          background-color: var(--color-bg-surface);
          border-top: 1px solid var(--color-border);
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: flex-end;
        }

        .p-dialog-mask {
          background-color: rgba(0, 0, 0, 0.4);
        }

        .p-dialog-header-close {
          color: var(--color-text-muted);
          transition: color 0.15s ease;

          &:hover {
            color: var(--color-text-primary);
            background-color: var(--color-bg-elevated);
          }
        }
      }
    }

    .dialog-header {
      width: 100%;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .dialog-content {
      line-height: 1.6;
    }

    .description-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDescriptionDialogComponent {
  readonly visible = signal(false);
  readonly title = signal('');
  readonly description = signal('');

  open(title: string, description: string): void {
    this.title.set(title);
    this.description.set(description);
    this.visible.set(true);
  }

  onClose(): void {
    this.visible.set(false);
  }
}
