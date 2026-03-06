import type { Meta, StoryObj } from '@storybook/angular';
import { TruncatedTextComponent } from './truncated-text.component';

const meta: Meta<TruncatedTextComponent> = {
  title: 'Catalog/Data Display/TruncatedText',
  component: TruncatedTextComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Displays text with CSS line-clamp truncation and tooltip showing full content.

## Features
- CSS-based multi-line truncation using \`-webkit-line-clamp\`
- Configurable number of visible lines via \`maxLines\`
- Native tooltip showing full text on hover
- Safe against XSS (text is escaped, not rendered as HTML)

## Usage
\`\`\`html
<app-truncated-text [text]="longDescription" />
<app-truncated-text [text]="content" [maxLines]="3" />
<app-truncated-text [text]="title" [maxLines]="1" [showTooltip]="false" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    text: {
      description: 'The text content to display',
      control: { type: 'text' },
    },
    maxLines: {
      description: 'Maximum number of lines before truncation',
      control: { type: 'number', min: 1, max: 10 },
    },
    showTooltip: {
      description: 'Whether to show tooltip with full text on hover',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<TruncatedTextComponent>;

const longText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`;

export const Default: Story = {
  args: {
    text: longText,
    maxLines: 2,
    showTooltip: true,
  },
  decorators: [
    (story) => ({
      template: `<div style="max-width: 300px;">${story().template || '<ng-container *ngComponentOutlet="storyComponent"></ng-container>'}</div>`,
      props: story().props,
    }),
  ],
};

export const SingleLine: Story = {
  args: {
    text: longText,
    maxLines: 1,
    showTooltip: true,
  },
  decorators: [
    (story) => ({
      template: `<div style="max-width: 300px;"><app-truncated-text [text]="text" [maxLines]="maxLines" [showTooltip]="showTooltip" /></div>`,
      props: story().props,
    }),
  ],
};

export const ThreeLines: Story = {
  args: {
    text: longText,
    maxLines: 3,
    showTooltip: true,
  },
  decorators: [
    (story) => ({
      template: `<div style="max-width: 300px;"><app-truncated-text [text]="text" [maxLines]="maxLines" [showTooltip]="showTooltip" /></div>`,
      props: story().props,
    }),
  ],
};

export const ShortText: Story = {
  args: {
    text: 'This is a short text that fits.',
    maxLines: 2,
    showTooltip: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Short text that does not need truncation.',
      },
    },
  },
};

export const NoTooltip: Story = {
  args: {
    text: longText,
    maxLines: 2,
    showTooltip: false,
  },
  decorators: [
    (story) => ({
      template: `<div style="max-width: 300px;"><app-truncated-text [text]="text" [maxLines]="maxLines" [showTooltip]="showTooltip" /></div>`,
      props: story().props,
    }),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Truncated text without tooltip on hover.',
      },
    },
  },
};

export const VariousWidths: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">200px container</div>
          <div style="max-width: 200px; border: 1px dashed #ccc; padding: 0.5rem;">
            <app-truncated-text [text]="text" [maxLines]="2" />
          </div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">300px container</div>
          <div style="max-width: 300px; border: 1px dashed #ccc; padding: 0.5rem;">
            <app-truncated-text [text]="text" [maxLines]="2" />
          </div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">400px container</div>
          <div style="max-width: 400px; border: 1px dashed #ccc; padding: 0.5rem;">
            <app-truncated-text [text]="text" [maxLines]="2" />
          </div>
        </div>
      </div>
    `,
    props: {
      text: longText,
    },
  }),
  parameters: {
    docs: {
      description: {
        story: 'Same text in different container widths.',
      },
    },
  },
};

export const Empty: Story = {
  args: {
    text: '',
    maxLines: 2,
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders nothing when text is empty.',
      },
    },
  },
};
