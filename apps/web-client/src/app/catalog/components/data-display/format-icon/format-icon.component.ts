import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// Import the canonical BookFormat type from core models
import { BookFormat } from '../../../../core/models/index.js';

export type IconSize = 'small' | 'medium' | 'large';

// Map lowercase format values to icons (API returns lowercase)
const FORMAT_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  epub: 'book',
  mobi: 'tablet_android',
  azw3: 'tablet_android',
  djvu: 'photo_library',
  cbz: 'collections',
  cbr: 'collections',
  txt: 'description',
  other: 'insert_drive_file',
};

const DEFAULT_ICON = 'insert_drive_file';

@Component({
  selector: 'app-format-icon',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    @if (format()) {
      <span
        class="format-icon"
        [class]="sizeClass()"
        [title]="format()"
        [attr.aria-label]="'Format: ' + format()"
      >
        <mat-icon aria-hidden="true">{{ iconName() }}</mat-icon>
      </span>
    }
  `,
  styles: `
    .format-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--mat-sys-on-surface-variant);
    }

    .size-small {
      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .size-medium {
      mat-icon {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    .size-large {
      mat-icon {
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormatIconComponent {
  readonly format = input<BookFormat | undefined>();
  readonly size = input<IconSize>('small');

  readonly iconName = computed(() => {
    const fmt = this.format();
    if (!fmt) return '';
    return FORMAT_ICONS[fmt] || DEFAULT_ICON;
  });

  readonly sizeClass = computed(() => {
    return `format-icon size-${this.size()}`;
  });
}
