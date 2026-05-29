import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-book-card-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-grid" role="status" aria-label="Cargando libros..." aria-busy="true">
      @for (item of items(); track $index) {
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-cover shimmer"></div>
          <div class="skeleton-body">
            <div class="skeleton-line title shimmer"></div>
            <div class="skeleton-line title short shimmer"></div>
            <div class="skeleton-line author shimmer"></div>
            <div class="skeleton-line badge shimmer"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
      padding: 0.5rem 0;
      width: 100%;
    }

    .skeleton-card {
      display: flex;
      flex-direction: column;
      border-radius: 0.75rem;
      overflow: hidden;
      background-color: var(--color-bg-elevated, rgb(30 41 59));
      border: 1px solid var(--color-border, rgb(51 65 85));
    }

    .skeleton-cover {
      aspect-ratio: 3 / 2;
      width: 100%;
      background-color: rgb(51 65 85);
    }

    .skeleton-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    .skeleton-line {
      border-radius: 0.25rem;
      background-color: rgb(51 65 85);
      height: 0.875rem;

      &.title {
        width: 90%;
      }

      &.short {
        width: 60%;
      }

      &.author {
        width: 75%;
        height: 0.75rem;
      }

      &.badge {
        width: 40%;
        height: 1.25rem;
        border-radius: 9999px;
      }
    }

    @keyframes shimmer {
      0% {
        background-position: -400px 0;
      }
      100% {
        background-position: 400px 0;
      }
    }

    .shimmer {
      background-image: linear-gradient(
        90deg,
        rgb(51 65 85) 0%,
        rgb(71 85 105) 50%,
        rgb(51 65 85) 100%
      );
      background-size: 800px 100%;
      animation: shimmer 1.6s ease-in-out infinite;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCardSkeletonComponent {
  /** Number of skeleton cards to render */
  readonly count = input<number>(12);

  readonly items = computed(() => Array.from({ length: this.count() }));
}
