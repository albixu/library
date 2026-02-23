import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    @if (visible()) {
      <div
        class="loading-overlay"
        [class.transparent]="transparent()"
        role="status"
        aria-busy="true"
        [attr.aria-label]="ariaLabel()">
        <div class="loading-content">
          <mat-spinner [diameter]="diameter()"></mat-spinner>
          @if (message()) {
            <p class="loading-message">{{ message() }}</p>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(var(--mat-sys-surface-rgb, 255 255 255), 0.8);
      z-index: 10;
    }

    .loading-overlay.transparent {
      background-color: transparent;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .loading-message {
      margin: 0;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  readonly visible = input<boolean>(false);
  readonly message = input<string | undefined>(undefined);
  readonly diameter = input<number>(48);
  readonly transparent = input<boolean>(false);

  readonly ariaLabel = computed(() => this.message() || 'Loading');
}
