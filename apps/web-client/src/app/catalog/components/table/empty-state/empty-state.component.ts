import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type EmptyStateType = 'empty' | 'no-results' | 'initial' | 'error';

interface StateConfig {
  icon: string;
  title: string;
  description: string;
}

const STATE_CONFIGS: Record<EmptyStateType, StateConfig> = {
  empty: {
    icon: 'inbox',
    title: 'No books yet',
    description: 'Start by adding your first book to your library.',
  },
  'no-results': {
    icon: 'search_off',
    title: 'No results found',
    description: 'Try adjusting your filters or search query.',
  },
  initial: {
    icon: 'auto_stories',
    title: 'Search your library',
    description: 'Use the filters above to find books in your collection.',
  },
  error: {
    icon: 'error_outline',
    title: 'Something went wrong',
    description: 'An error occurred while loading books. Please try again.',
  },
};

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="empty-state" role="status" [attr.aria-label]="ariaLabel()">
      <mat-icon class="empty-state-icon" aria-hidden="true">
        {{ displayIcon() }}
      </mat-icon>
      <h3 class="empty-state-title">{{ displayTitle() }}</h3>
      <p class="empty-state-description">{{ displayDescription() }}</p>
      @if (actionLabel()) {
        <button mat-flat-button class="empty-state-action" (click)="action.emit()">
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
      color: var(--mat-sys-outline);
      margin-bottom: 1rem;
    }

    .empty-state-title {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .empty-state-description {
      margin: 0 0 1.5rem;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
      max-width: 24rem;
    }

    .empty-state-action {
      margin-top: 0.5rem;
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
