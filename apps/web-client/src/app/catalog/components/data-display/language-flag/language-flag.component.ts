import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt';

interface LanguageInfo {
  flag: string;
  name: string;
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  en: { flag: '🇬🇧', name: 'English' },
  es: { flag: '🇪🇸', name: 'Spanish' },
  fr: { flag: '🇫🇷', name: 'French' },
  de: { flag: '🇩🇪', name: 'German' },
  it: { flag: '🇮🇹', name: 'Italian' },
  pt: { flag: '🇵🇹', name: 'Portuguese' },
};

const DEFAULT_LANGUAGE: LanguageInfo = { flag: '🌐', name: 'Unknown' };

@Component({
  selector: 'app-language-flag',
  standalone: true,
  imports: [MatTooltipModule],
  template: `
    @if (languageCode()) {
      <span
        class="language-flag"
        [title]="languageName()"
        [attr.aria-label]="'Language: ' + languageName()"
      >
        <span class="flag-emoji" role="img" [attr.aria-label]="languageName()">
          {{ flagEmoji() }}
        </span>
        @if (showName()) {
          <span class="language-name">{{ languageName() }}</span>
        }
      </span>
    }
  `,
  styles: `
    .language-flag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .flag-emoji {
      font-size: 1rem;
      line-height: 1;
    }

    .language-name {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageFlagComponent {
  readonly languageCode = input<string | undefined>();
  readonly showName = input<boolean>(false);

  readonly languageInfo = computed((): LanguageInfo => {
    const code = this.languageCode();
    if (!code) return DEFAULT_LANGUAGE;
    return LANGUAGE_MAP[code] || DEFAULT_LANGUAGE;
  });

  readonly flagEmoji = computed(() => this.languageInfo().flag);
  readonly languageName = computed(() => this.languageInfo().name);
}
