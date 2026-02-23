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
| pdf | picture_as_pdf |
| epub | book |
| mobi | tablet_android |
| azw3 | tablet_android |
| djvu | photo_library |
| cbz | collections |
| cbr | collections |
| txt | description |
| other | insert_drive_file |

## Sizes
- \`small\` (default): 1rem
- \`medium\`: 1.25rem
- \`large\`: 1.5rem

## Usage
\`\`\`html
<app-format-icon [format]="'pdf'" />
<app-format-icon [format]="'epub'" [size]="'large'" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    format: {
      description: 'The book format to display',
      control: { type: 'select' },
      options: ['pdf', 'epub', 'mobi', 'azw3', 'djvu', 'cbz', 'cbr', 'txt', 'other'],
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

export const Pdf: Story = {
  args: {
    format: 'pdf',
    size: 'small',
  },
};

export const Epub: Story = {
  args: {
    format: 'epub',
    size: 'small',
  },
};

export const Mobi: Story = {
  args: {
    format: 'mobi',
    size: 'small',
  },
};

export const Azw3: Story = {
  args: {
    format: 'azw3',
    size: 'small',
  },
};

export const Djvu: Story = {
  args: {
    format: 'djvu',
    size: 'small',
  },
};

export const Cbz: Story = {
  args: {
    format: 'cbz',
    size: 'small',
  },
};

export const Cbr: Story = {
  args: {
    format: 'cbr',
    size: 'small',
  },
};

export const Txt: Story = {
  args: {
    format: 'txt',
    size: 'small',
  },
};

export const Other: Story = {
  args: {
    format: 'other',
    size: 'small',
  },
};

export const AllFormats: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <div style="text-align: center;">
          <app-format-icon [format]="'pdf'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">pdf</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'epub'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">epub</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'mobi'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">mobi</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'azw3'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">azw3</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'djvu'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">djvu</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'cbz'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">cbz</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'cbr'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">cbr</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'txt'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">txt</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'other'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">other</div>
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
          <app-format-icon [format]="'pdf'" [size]="'small'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">Small</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'pdf'" [size]="'medium'" />
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">Medium</div>
        </div>
        <div style="text-align: center;">
          <app-format-icon [format]="'pdf'" [size]="'large'" />
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
