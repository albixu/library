import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import {
  RecommendationsService,
  RecommendationItem,
} from '../data-access/recommendations.service.js';

/**
 * RecommendationsPageComponent - "Para ti" personalised recommendations page
 *
 * Features:
 * - Fetches recommendations from GET /api/books/recommendations
 * - Shows loading skeleton while fetching
 * - Shows empty state when there is no history yet
 * - Shows a grid of recommended book cards with cover, title, author and link
 */
@Component({
  selector: 'app-recommendations-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="recommendations-page">
      <div class="recommendations-header">
        <h1 class="recommendations-title">Para ti</h1>
        @if (!loading() && label()) {
          <p class="recommendations-label">
            <span class="material-symbols-outlined label-icon" aria-hidden="true">category</span>
            {{ label() }}
          </p>
        }
      </div>

      @if (loading()) {
        <!-- Loading skeleton -->
        <div class="recommendations-grid" aria-busy="true" aria-label="Cargando recomendaciones">
          @for (_ of skeletonItems; track $index) {
            <div class="book-card book-card--skeleton" aria-hidden="true">
              <div class="book-card__cover skeleton-box"></div>
              <div class="book-card__info">
                <div class="skeleton-line skeleton-line--title"></div>
                <div class="skeleton-line skeleton-line--author"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <!-- Error state -->
        <div class="empty-state" role="alert" data-testid="error-state">
          <span class="material-symbols-outlined empty-icon" aria-hidden="true">error_outline</span>
          <p class="empty-message">
            No se pudieron cargar las recomendaciones. Inténtalo de nuevo.
          </p>
          <button type="button" class="btn btn-primary" (click)="load()">
            <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
            Reintentar
          </button>
        </div>
      } @else if (items().length === 0) {
        <!-- Empty state -->
        <div class="empty-state" data-testid="empty-state">
          <span class="material-symbols-outlined empty-icon" aria-hidden="true">auto_stories</span>
          <p class="empty-message">Aún no tenemos suficiente historial para recomendarte libros.</p>
          <p class="empty-hint">Continúa explorando el catálogo y vuelve pronto.</p>
        </div>
      } @else {
        <!-- Recommendations grid -->
        <div class="recommendations-grid" role="list">
          @for (item of items(); track item.bookId) {
            <a
              class="book-card"
              [routerLink]="['/books', item.bookId]"
              role="listitem"
              [attr.aria-label]="item.title + ' de ' + item.author"
            >
              <div class="book-card__cover">
                <div class="book-card__cover-placeholder" aria-hidden="true">
                  <span class="material-symbols-outlined">book</span>
                </div>
                <div
                  class="book-card__similarity"
                  [attr.aria-label]="'Similitud ' + similarityPercent(item.similarity) + '%'"
                >
                  {{ similarityPercent(item.similarity) }}%
                </div>
              </div>
              <div class="book-card__info">
                <p class="book-card__title">{{ item.title }}</p>
                <p class="book-card__author">{{ item.author }}</p>
                <p class="book-card__category">{{ item.dominantCategory }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .recommendations-page {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .recommendations-header {
      margin-bottom: 2rem;
    }

    .recommendations-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.5rem;

      [data-theme='dark'] & {
        color: rgb(241 245 249);
      }

      [data-theme='light'] & {
        color: rgb(15 23 42);
      }
    }

    .recommendations-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.9375rem;
      margin: 0;

      [data-theme='dark'] & {
        color: rgb(148 163 184);
      }

      [data-theme='light'] & {
        color: rgb(100 116 139);
      }
    }

    .label-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }

    /* Grid */
    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.5rem;
    }

    /* Book card */
    .book-card {
      display: flex;
      flex-direction: column;
      border-radius: 0.75rem;
      overflow: hidden;
      text-decoration: none;
      transition:
        transform 150ms ease,
        box-shadow 150ms ease;
      cursor: pointer;

      [data-theme='dark'] & {
        background-color: rgb(30 41 59);
        border: 1px solid rgb(51 65 85);
      }

      [data-theme='light'] & {
        background-color: rgb(255 255 255);
        border: 1px solid rgb(226 232 240);
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.07);
      }

      &:hover {
        transform: translateY(-2px);

        [data-theme='dark'] & {
          box-shadow: 0 8px 16px -4px rgb(0 0 0 / 0.4);
        }

        [data-theme='light'] & {
          box-shadow: 0 8px 16px -4px rgb(0 0 0 / 0.12);
        }
      }

      &:focus-visible {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
      }
    }

    .book-card__cover {
      position: relative;
      aspect-ratio: 2/3;
      background-color: rgb(226 232 240);
      overflow: hidden;

      [data-theme='dark'] & {
        background-color: rgb(51 65 85);
      }
    }

    .book-card__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .book-card__cover-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      .material-symbols-outlined {
        font-size: 3rem;

        [data-theme='dark'] & {
          color: rgb(100 116 139);
        }

        [data-theme='light'] & {
          color: rgb(148 163 184);
        }
      }
    }

    .book-card__similarity {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      background-color: #17a1cf;
      color: white;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 0.375rem;
    }

    .book-card__info {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .book-card__title {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;

      [data-theme='dark'] & {
        color: rgb(241 245 249);
      }

      [data-theme='light'] & {
        color: rgb(15 23 42);
      }
    }

    .book-card__author {
      font-size: 0.8125rem;
      margin: 0;

      [data-theme='dark'] & {
        color: rgb(148 163 184);
      }

      [data-theme='light'] & {
        color: rgb(100 116 139);
      }
    }

    .book-card__category {
      font-size: 0.75rem;
      margin: 0;

      [data-theme='dark'] & {
        color: rgb(100 116 139);
      }

      [data-theme='light'] & {
        color: rgb(148 163 184);
      }
    }

    /* Skeleton */
    .book-card--skeleton {
      pointer-events: none;
    }

    .skeleton-box {
      background: linear-gradient(
        90deg,
        rgb(226 232 240) 25%,
        rgb(241 245 249) 50%,
        rgb(226 232 240) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;

      [data-theme='dark'] & {
        background: linear-gradient(
          90deg,
          rgb(51 65 85) 25%,
          rgb(71 85 105) 50%,
          rgb(51 65 85) 75%
        );
        background-size: 200% 100%;
      }
    }

    .skeleton-line {
      border-radius: 0.25rem;
      animation: shimmer 1.5s infinite;

      [data-theme='dark'] & {
        background: linear-gradient(
          90deg,
          rgb(51 65 85) 25%,
          rgb(71 85 105) 50%,
          rgb(51 65 85) 75%
        );
        background-size: 200% 100%;
      }

      [data-theme='light'] & {
        background: linear-gradient(
          90deg,
          rgb(226 232 240) 25%,
          rgb(241 245 249) 50%,
          rgb(226 232 240) 75%
        );
        background-size: 200% 100%;
      }
    }

    .skeleton-line--title {
      height: 0.875rem;
      width: 90%;
      margin-bottom: 0.375rem;
    }

    .skeleton-line--author {
      height: 0.75rem;
      width: 60%;
    }

    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    /* Empty / error state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 4rem 1.5rem;
      text-align: center;
    }

    .empty-icon {
      font-size: 3.5rem;

      [data-theme='dark'] & {
        color: rgb(100 116 139);
      }

      [data-theme='light'] & {
        color: rgb(148 163 184);
      }
    }

    .empty-message {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      max-width: 400px;

      [data-theme='dark'] & {
        color: rgb(203 213 225);
      }

      [data-theme='light'] & {
        color: rgb(51 65 85);
      }
    }

    .empty-hint {
      margin: 0;
      font-size: 0.875rem;
      max-width: 400px;

      [data-theme='dark'] & {
        color: rgb(100 116 139);
      }

      [data-theme='light'] & {
        color: rgb(148 163 184);
      }
    }

    /* Button */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      transition: background-color 150ms ease;

      .material-symbols-outlined {
        font-size: 1.125rem;
      }
    }

    .btn-primary {
      background-color: #17a1cf;
      color: white;

      &:hover {
        background-color: #1389b3;
      }

      &:focus-visible {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .recommendations-page {
        padding: 1rem;
      }

      .recommendations-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 1rem;
      }
    }
  `,
})
export class RecommendationsPageComponent implements OnInit {
  private readonly recommendationsService = inject(RecommendationsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly items = signal<RecommendationItem[]>([]);
  readonly label = signal('');

  /** Placeholder array for skeleton loading cards */
  readonly skeletonItems = Array.from({ length: 8 });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.recommendationsService
      .getRecommendations()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe((response) => {
        if (response === null) {
          this.error.set(true);
        } else {
          this.items.set(response.items);
          this.label.set(response.label);
        }
        this.loading.set(false);
      });
  }

  /** Convert a 0–1 similarity score to a whole-number percentage */
  similarityPercent(similarity: number): number {
    return Math.round(similarity * 100);
  }
}
