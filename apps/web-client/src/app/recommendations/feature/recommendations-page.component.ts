import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  viewChild,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import {
  RecommendationsService,
  RecommendationItem,
} from '../data-access/recommendations.service.js';
import { Book } from '../../core/models/index.js';
import { BookCoverCardComponent } from '../../catalog/components/cards/book-cover-card/book-cover-card.component.js';
import { BookCardSkeletonComponent } from '../../catalog/components/cards/book-card-skeleton/book-card-skeleton.component.js';
import { SendToKindleDialogComponent } from '../../catalog/components/dialogs/send-to-kindle-dialog/send-to-kindle-dialog.component.js';
import { BookDescriptionDialogComponent } from '../../catalog/components/dialogs/book-description-dialog/book-description-dialog.component.js';
import { DialogService } from '../../core/services/dialog.service.js';

/** Shape stored in the books signal — keeps the mapped Book next to its cover URL */
interface BookEntry {
  book: Book;
  coverUrl: string | undefined;
}

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
  imports: [BookCoverCardComponent, BookCardSkeletonComponent, BookDescriptionDialogComponent],
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
            <app-book-card-skeleton />
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
      } @else if (books().length === 0) {
        <!-- Empty state -->
        <div class="empty-state" data-testid="empty-state">
          <span class="material-symbols-outlined empty-icon" aria-hidden="true">auto_stories</span>
          <p class="empty-message">Aún no tenemos suficiente historial para recomendarte libros.</p>
          <p class="empty-hint">Continúa explorando el catálogo y vuelve pronto.</p>
        </div>
      } @else {
        <!-- Recommendations grid -->
        <div class="recommendations-grid" role="list">
          @for (entry of books(); track entry.book.id) {
            <app-book-cover-card
              role="listitem"
              [book]="entry.book"
              [coverUrl]="entry.coverUrl"
              (sendToKindle)="onSendToKindle($event)"
              (favoriteToggle)="onFavoriteToggle($event)"
              (showDescription)="onShowDescription($event)"
            />
          }
        </div>
      }
    </div>

    <app-book-description-dialog />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
      transition: scrollbar-color 0.2s ease;
    }

    :host(:hover) {
      scrollbar-color: var(--color-border-strong, rgb(148 163 184)) transparent;
    }

    :host::-webkit-scrollbar {
      width: 6px;
    }

    :host::-webkit-scrollbar-track {
      background: transparent;
    }

    :host::-webkit-scrollbar-thumb {
      background-color: transparent;
      border-radius: 3px;
      transition: background-color 0.2s ease;
    }

    :host(:hover)::-webkit-scrollbar-thumb {
      background-color: rgb(148 163 184);
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
      color: rgb(241 245 249);
    }

    .recommendations-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.9375rem;
      margin: 0;
      color: rgb(148 163 184);
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
      color: rgb(100 116 139);
    }

    .empty-message {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      max-width: 400px;
      color: rgb(203 213 225);
    }

    .empty-hint {
      margin: 0;
      font-size: 0.875rem;
      max-width: 400px;
      color: rgb(100 116 139);
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
  private readonly dialogService = inject(DialogService);

  readonly descriptionDialog = viewChild.required(BookDescriptionDialogComponent);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly label = signal('');

  /** Mapped book entries ready to pass to BookCoverCardComponent */
  readonly books = signal<BookEntry[]>([]);

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
        catchError(() => {
          this.error.set(true);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        if (response === null) return;
        this.label.set(response.label);
        this.books.set(response.items.map((item) => this.toBookEntry(item)));
      });
  }

  onSendToKindle(book: Book): void {
    this.dialogService.open(SendToKindleDialogComponent, {
      data: book,
      width: '400px',
      maxWidth: '90vw',
    });
  }

  onFavoriteToggle(_event: { book: Book; favorite: boolean }): void {
    // BookCoverCardComponent already handles optimistic updates internally.
    // Nothing extra needed at page level.
  }

  onShowDescription(book: Book): void {
    this.descriptionDialog().open(book.title, book.description ?? '', book.isbn);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private toBookEntry(item: RecommendationItem): BookEntry {
    const book: Book = {
      id: item.bookId,
      title: item.title,
      authors: [{ id: '', name: item.author }],
      isbn: null,
      type: '',
      format: 'pdf',
      language: '',
      level: null,
      categories: item.dominantCategory ? [{ id: '', name: item.dominantCategory }] : [],
      available: true,
      favorite: false,
      originalDescription: '',
      description: '',
      similarityScore: item.similarity,
    };
    return { book, coverUrl: item.coverUrl ?? undefined };
  }
}
