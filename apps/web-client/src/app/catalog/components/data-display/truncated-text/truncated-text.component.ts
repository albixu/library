import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-truncated-text',
  standalone: true,
  imports: [MatTooltipModule],
  template: `
    @if (text()) {
      <span
        class="truncated-text"
        [style.--max-lines]="maxLines()"
        [attr.title]="showTooltip() ? text() : null"
      >
        {{ text() }}
      </span>
    }
  `,
  styles: `
    .truncated-text {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--max-lines, 2);
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TruncatedTextComponent {
  readonly text = input<string>('');
  readonly maxLines = input<number>(2);
  readonly showTooltip = input<boolean>(true);
}
