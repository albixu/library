import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [],
  template: `
    @if (visible()) {
      <div
        class="loading-overlay"
        [class.transparent]="transparent()"
        role="status"
        aria-busy="true"
        [attr.aria-label]="ariaLabel()"
      >
        <div class="loading-content">
          <div class="spinner" [style.width.px]="diameter()" [style.height.px]="diameter()"></div>
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
      z-index: 10;
      backdrop-filter: blur(2px);
      background-color: rgba(15, 23, 42, 0.8); /* slate-900 with opacity */
    }

    .loading-overlay.transparent {
      background-color: transparent;
      backdrop-filter: none;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      border: 3px solid rgb(51 65 85); /* slate-700 */
      border-top-color: #17a1cf; /* primary */
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .loading-message {
      margin: 0;
      font-size: 0.875rem;
      color: rgb(148 163 184); /* slate-400 */
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  readonly visible = input<boolean>(false);
  readonly message = input<string | undefined>(undefined);
  readonly diameter = input<number>(48);
  readonly transparent = input<boolean>(false);

  readonly ariaLabel = computed(() => this.message() || 'Cargando');
}
