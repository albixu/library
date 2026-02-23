import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
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
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
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
      [attr.aria-label]="'Book: ' + book().title"
      tabindex="0"
      matRipple
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
          mat-icon-button
          aria-label="Send to Kindle"
          class="book-card-action"
          (click)="onSendToKindle($event)"
        >
          <mat-icon>send_to_mobile</mat-icon>
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
      background-color: var(--mat-sys-surface-container-low);
      border-radius: 0.75rem;
      cursor: pointer;
      transition:
        box-shadow 0.2s ease,
        background-color 0.2s ease;

      &:hover {
        background-color: var(--mat-sys-surface-container);
      }

      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }

      &.selected {
        background-color: var(--mat-sys-secondary-container);
        box-shadow: 0 0 0 2px var(--mat-sys-primary);
      }
    }

    .book-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .book-card-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .book-card-action {
      margin: -0.5rem -0.5rem 0 0;
    }

    .book-card-title {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      line-height: 1.3;
    }

    .book-card-authors {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .book-card-description {
      margin-bottom: 0.75rem;
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .book-card-footer {
      margin-top: auto;
      padding-top: 0.5rem;
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
