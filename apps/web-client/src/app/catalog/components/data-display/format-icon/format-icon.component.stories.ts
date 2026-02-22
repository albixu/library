import type { Meta, StoryObj } from '@storybook/angular';
import { FormatIconComponent } from './format-icon.component';

const meta: Meta<FormatIconComponent> = {
  title: 'Catalog/Data Display/FormatIcon',
  component: FormatIconComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Displays a Material icon representing the book format.

## Format Icons
| Format | Icon |
|--------|------|
| PDF | picture_as_pdf |
| EPUB | book |
| MOBI | tablet_android |
| AZW3 | tablet_android |
| TXT | description |
| Other | insert_drive_file |

## Sizes
- \`small\` (default): 1rem
- \`medium\`: 1.25rem
- \`large\`: 1.5rem

## Usage
\`\`\`html
<app-format-icon [format]="'PDF'" />
<app-format-icon [format]="'EPUB'" [size]="'large'" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    format: {
      description: 'The book format to display',
      control: { type: 'select' },
      options: ['PDF', 'EPUB', 'MOBI', 'AZW3', 'TXT'],
    },
    size: {
      description: 'Icon size',
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<FormatIconComponent>;

export const PDF: Story = {
  args: {
    format: 'PDF',
    size: 'small',
  },
};

export const EPUB: Story = {
  args: {
    format: 'EPUB',
    size: 'small',
  },
};

export const MOBI: Story = {
  args: {
    format: 'MOBI',
    size: 'small',
  },
};

export const AZW3: Story = {
  args: {
    format: 'AZW3',
    size: 'small',
  },
};

export const TXT: Story = {
  args: {
    format: 'TXT',
    size: 'small',
  },
};

export const AllFormats: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div style="text-align: center;">
          <app-format-icon [format]="'PDF'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">PDF</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'EPUB'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">EPUB</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'MOBI'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">MOBI</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'AZW3'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">AZW3</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'TXT'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">TXT</div>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'All format icons displayed together.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div style="text-align: center;">
          <app-format-icon [format]="'PDF'" [size]="'small'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">Small</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'PDF'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">Medium</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'PDF'" [size]="'large'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">Large</div>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Icon sizes comparison.',
      },
    },
  },
};

export const Undefined: Story = {
  args: {
    format: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders nothing when format is undefined.',
      },
    },
  },
};
