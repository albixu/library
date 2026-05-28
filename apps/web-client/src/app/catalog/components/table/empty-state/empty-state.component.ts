import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type EmptyStateType = 'empty' | 'no-results' | 'initial' | 'error';

interface StateConfig {
  icon: string;
  title: string;
  description: string;
}

const STATE_CONFIGS: Record<EmptyStateType, StateConfig> = {
  empty: {
    icon: 'inbox',
    title: 'Sin libros todavía',
    description: 'Comienza añadiendo tu primer libro a tu biblioteca.',
  },
  'no-results': {
    icon: 'search_off',
    title: 'Sin resultados',
    description: 'Intenta ajustar tus filtros o la búsqueda.',
  },
  initial: {
    icon: 'auto_stories',
    title: 'Busca en tu biblioteca',
    description: 'Usa los filtros de arriba para encontrar libros en tu colección.',
  },
  error: {
    icon: 'error_outline',
    title: 'Algo salió mal',
    description: 'Ocurrió un error al cargar los libros. Por favor, inténtalo de nuevo.',
  },
};

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  template: `
    <div class="empty-state" role="status" [attr.aria-label]="ariaLabel()">
      <span class="material-symbols-outlined empty-state-icon" aria-hidden="true">
        {{ displayIcon() }}
      </span>
      <h3 class="empty-state-title">{{ displayTitle() }}</h3>
      <p class="empty-state-description">{{ displayDescription() }}</p>
      @if (actionLabel()) {
        <button class="empty-state-action" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      text-align: center;
    }

    .empty-state-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      margin-bottom: 1rem;
      color: rgb(71 85 105); /* slate-600 */
      font-variation-settings:
        'FILL' 0,
        'wght' 300,
        'GRAD' 0,
        'opsz' 48;
    }

    .empty-state-title {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 500;
      color: rgb(241 245 249); /* slate-100 */
    }

    .empty-state-description {
      margin: 0 0 1.5rem;
      font-size: 0.875rem;
      max-width: 24rem;
      color: rgb(148 163 184); /* slate-400 */
    }

    .empty-state-action {
      margin-top: 0.5rem;
      padding: 0.5rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      transition: all 150ms ease;
      background-color: #17a1cf;
      color: white;
    }

    .empty-state-action:hover {
      background-color: #1493c0;
    }

    .empty-state-action:active {
      background-color: #1082ab;
    }

    .empty-state-action:focus-visible {
      outline: 2px solid #17a1cf;
      outline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly type = input<EmptyStateType>('empty');
  readonly title = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  readonly icon = input<string | undefined>(undefined);
  readonly actionLabel = input<string | undefined>(undefined);

  readonly action = output<void>();

  private readonly stateConfig = computed(() => STATE_CONFIGS[this.type()] || STATE_CONFIGS.empty);

  readonly displayIcon = computed(() => this.icon() || this.stateConfig().icon);
  readonly displayTitle = computed(() => this.title() || this.stateConfig().title);
  readonly displayDescription = computed(
    () => this.description() || this.stateConfig().description
  );

  readonly ariaLabel = computed(() => `${this.displayTitle()}: ${this.displayDescription()}`);
}
