import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CategoryChipsComponent } from '../../data-display/category-chips/category-chips.component.js';
import { LevelBadgeComponent } from '../../data-display/level-badge/level-badge.component.js';
import { FormatIconComponent } from '../../data-display/format-icon/format-icon.component.js';
import { LanguageFlagComponent } from '../../data-display/language-flag/language-flag.component.js';
import { TruncatedTextComponent } from '../../data-display/truncated-text/truncated-text.component.js';
import { Book } from '../../../../core/models/index.js';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [
    CategoryChipsComponent,
    LevelBadgeComponent,
    FormatIconComponent,
    LanguageFlagComponent,
    TruncatedTextComponent,
  ],
  template: `
    <article
      class="book-card"
      [class.selected]="selected()"
      role="article"
      [attr.aria-label]="'Libro: ' + book().title"
      tabindex="0"
      (click)="onSelect()"
      (keydown.enter)="onSelect()"
    >
      <header class="book-card-header">
        <div class="book-card-meta">
          <app-format-icon [format]="book().format" [size]="'medium'" />
          <app-language-flag [languageCode]="book().language" />
          <app-level-badge [level]="book().level" />
        </div>
        <button
          type="button"
          aria-label="Enviar a Kindle"
          class="book-card-action"
          (click)="onSendToKindle($event)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">send_to_mobile</span>
        </button>
      </header>

      <h3 class="book-card-title">{{ book().title }}</h3>
      <p class="book-card-authors">{{ authorNames() }}</p>

      @if (book().description) {
        <app-truncated-text
          [text]="book().description!"
          [maxLines]="2"
          class="book-card-description"
        />
      }

      <footer class="book-card-footer">
        <app-category-chips [categories]="categoryNames()" [maxVisible]="2" />
      </footer>
    </article>
  `,
  styles: `
    .book-card {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      border-radius: 0.75rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition:
        box-shadow 0.2s ease,
        background-color 0.2s ease,
        transform 0.1s ease;

      /* Ripple effect using pseudo-element */
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(23, 161, 207, 0.3);
        transform: translate(-50%, -50%);
        transition:
          width 0.6s ease,
          height 0.6s ease;
      }

      &:active::before {
        width: 300px;
        height: 300px;
      }

      /* Dark mode */
      [data-theme='dark'] & {
        background-color: rgb(30 41 59); /* slate-800 */

        &:hover {
          background-color: rgb(51 65 85); /* slate-700 */
        }

        &.selected {
          background-color: rgb(15 23 42); /* slate-900 */
          box-shadow: 0 0 0 2px #17a1cf;
        }
      }

      /* Light mode */
      [data-theme='light'] & {
        background-color: rgb(255 255 255); /* white */
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);

        &:hover {
          background-color: rgb(248 250 252); /* slate-50 */
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        &.selected {
          background-color: rgb(240 249 255); /* sky-50 */
          box-shadow: 0 0 0 2px #17a1cf;
        }
      }

      &:focus-visible {
        outline: 2px solid #17a1cf;
        outline-offset: 2px;
      }

      &:active {
        transform: scale(0.98);
      }
    }

    .book-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
      position: relative;
      z-index: 1;
    }

    .book-card-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .book-card-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      margin: -0.5rem -0.5rem 0 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
      transition: background-color 0.2s ease;

      .material-symbols-outlined {
        font-size: 1.25rem;
      }

      /* Dark mode */
      [data-theme='dark'] & {
        color: rgb(203 213 225); /* slate-300 */

        &:hover {
          background-color: rgba(51, 65, 85, 0.5); /* slate-700 with opacity */
        }

        &:focus-visible {
          outline: 2px solid #17a1cf;
          outline-offset: 2px;
        }
      }

      /* Light mode */
      [data-theme='light'] & {
        color: rgb(71 85 105); /* slate-600 */

        &:hover {
          background-color: rgba(226, 232, 240, 0.8); /* slate-200 with opacity */
        }

        &:focus-visible {
          outline: 2px solid #17a1cf;
          outline-offset: 2px;
        }
      }
    }

    .book-card-title {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.3;
      position: relative;
      z-index: 1;

      [data-theme='dark'] & {
        color: rgb(241 245 249); /* slate-100 */
      }

      [data-theme='light'] & {
        color: rgb(15 23 42); /* slate-900 */
      }
    }

    .book-card-authors {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      position: relative;
      z-index: 1;

      [data-theme='dark'] & {
        color: rgb(148 163 184); /* slate-400 */
      }

      [data-theme='light'] & {
        color: rgb(100 116 139); /* slate-500 */
      }
    }

    .book-card-description {
      margin-bottom: 0.75rem;
      font-size: 0.8125rem;
      position: relative;
      z-index: 1;

      [data-theme='dark'] & {
        color: rgb(148 163 184); /* slate-400 */
      }

      [data-theme='light'] & {
        color: rgb(100 116 139); /* slate-500 */
      }
    }

    .book-card-footer {
      margin-top: auto;
      padding-top: 0.5rem;
      position: relative;
      z-index: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCardComponent {
  readonly book = input.required<Book>();
  readonly selected = input<boolean>(false);

  readonly bookSelect = output<Book>();
  readonly sendToKindle = output<Book>();

  // Computed signals to extract names from Author/Category objects
  readonly authorNames = computed(() =>
    this.book()
      .authors.map((a) => a.name)
      .join(', ')
  );

  readonly categoryNames = computed(() => this.book().categories.map((c) => c.name));

  onSelect(): void {
    this.bookSelect.emit(this.book());
  }

  onSendToKindle(event: Event): void {
    event.stopPropagation();
    this.sendToKindle.emit(this.book());
  }
}
