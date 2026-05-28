import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { LevelBadgeComponent } from '../../data-display/level-badge/level-badge.component.js';
import { Book } from '../../../../core/models/index.js';

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ja: '🇯🇵',
  zh: '🇨🇳',
};

@Component({
  selector: 'app-book-cover-card',
  standalone: true,
  imports: [LevelBadgeComponent],
  template: `
    <article
      class="book-cover-card"
      role="article"
      [attr.aria-label]="'Libro: ' + book().title"
    >
      <!-- Cover image area -->
      <div class="cover-area">
        @if (coverUrl()) {
          <img
            class="cover-img"
            [src]="coverUrl()"
            [alt]="'Portada de ' + book().title"
          />
        } @else {
          <div class="cover-placeholder" aria-hidden="true">
            <span class="material-symbols-outlined placeholder-icon">menu_book</span>
          </div>
        }

        <!-- Language badge -->
        <div class="language-badge" [attr.aria-label]="'Idioma: ' + book().language">
          <span class="lang-code">{{ languageCode() }}</span>
          <span class="lang-flag" aria-hidden="true">{{ languageFlag() }}</span>
        </div>

        <!-- Favorite icon (visual only) -->
        <button
          type="button"
          class="favorite-btn"
          aria-label="Favorito"
          tabindex="-1"
          (click)="$event.stopPropagation()"
        >
          <span class="material-symbols-outlined" aria-hidden="true">favorite_border</span>
        </button>
      </div>

      <!-- Card body -->
      <div class="card-body">
        <!-- Title row with info tooltip -->
        <div class="title-row">
          <h3 class="book-title">{{ book().title }}</h3>
          <button
            type="button"
            class="info-btn"
            [title]="book().title"
            aria-label="Ver título completo"
          >
            <span class="material-symbols-outlined" aria-hidden="true">info</span>
          </button>
        </div>

        <!-- Author -->
        <p class="book-author">{{ authorNames() }}</p>

        <!-- ISBN -->
        @if (book().isbn) {
          <p class="book-isbn">ISBN: {{ book().isbn }}</p>
        }

        <!-- Level badge -->
        <div class="badge-row">
          <app-level-badge [level]="book().level" />
        </div>

        <!-- Send to Kindle button — only when available -->
        @if (book().available) {
          <button
            type="button"
            class="kindle-btn"
            aria-label="Enviar a Kindle"
            (click)="onSendToKindle($event)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">send_to_mobile</span>
            <span>Enviar a Kindle</span>
          </button>
        }
      </div>
    </article>
  `,
  styles: `
    .book-cover-card {
      display: flex;
      flex-direction: column;
      border-radius: 0.75rem;
      overflow: hidden;
      background-color: var(--color-bg-elevated, rgb(30 41 59));
      border: 1px solid var(--color-border, rgb(51 65 85));
      transition: box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      }
    }

    /* ── Cover area ── */
    .cover-area {
      position: relative;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      flex-shrink: 0;
    }

    .cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgb(15 23 42), rgb(30 41 59));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .placeholder-icon {
      font-size: 3rem;
      color: var(--color-accent, #17a1cf);
      opacity: 0.6;
    }

    /* ── Language badge ── */
    .language-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: rgb(226 232 240); /* slate-200 */
      user-select: none;
    }

    .lang-code {
      text-transform: uppercase;
    }

    /* ── Favorite button ── */
    .favorite-btn {
      position: absolute;
      top: 0.375rem;
      right: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      cursor: default;
      color: rgb(203 213 225); /* slate-300 */

      .material-symbols-outlined {
        font-size: 1.1rem;
      }
    }

    /* ── Card body ── */
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.75rem;
      flex: 1;
    }

    /* ── Title row ── */
    .title-row {
      display: flex;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .book-title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.3;
      color: var(--color-text-primary, rgb(241 245 249));
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      flex: 1;
    }

    .info-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
      color: var(--color-text-muted, rgb(100 116 139));
      padding: 0;
      margin-top: 0.1rem;

      .material-symbols-outlined {
        font-size: 1rem;
      }

      &:hover {
        color: var(--color-text-secondary, rgb(148 163 184));
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent, #17a1cf);
        outline-offset: 2px;
      }
    }

    /* ── Author ── */
    .book-author {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-text-secondary, rgb(148 163 184));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── ISBN ── */
    .book-isbn {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-text-muted, rgb(100 116 139));
      font-family: monospace;
    }

    /* ── Badge row ── */
    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.125rem;
    }

    /* ── Send to Kindle button ── */
    .kindle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: auto;
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--color-accent, #17a1cf);
      border-radius: 0.5rem;
      background: transparent;
      color: var(--color-accent, #17a1cf);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s ease;
      align-self: flex-start;

      .material-symbols-outlined {
        font-size: 1rem;
      }

      &:hover {
        background-color: rgba(23, 161, 207, 0.12);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent, #17a1cf);
        outline-offset: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCoverCardComponent {
  readonly book = input.required<Book>();
  readonly coverUrl = input<string | undefined>(undefined);

  readonly sendToKindle = output<Book>();

  readonly authorNames = computed(() =>
    this.book()
      .authors.map((a) => a.name)
      .join(', ')
  );

  readonly languageCode = computed(() => this.book().language.toUpperCase());

  readonly languageFlag = computed(() => {
    const lang = this.book().language.toLowerCase();
    return LANGUAGE_FLAGS[lang] ?? '';
  });

  onSendToKindle(event: Event): void {
    event.stopPropagation();
    this.sendToKindle.emit(this.book());
  }
}
