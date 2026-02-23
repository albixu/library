import type { Meta, StoryObj } from '@storybook/angular';
import { LanguageFlagComponent } from './language-flag.component';

const meta: Meta<LanguageFlagComponent> = {
  title: 'Catalog/Data Display/LanguageFlag',
  component: LanguageFlagComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Displays a flag emoji representing the book's language.

## Supported Languages
| Code | Flag | Name |
|------|------|------|
| en | 🇬🇧 | English |
| es | 🇪🇸 | Spanish |
| fr | 🇫🇷 | French |
| de | 🇩🇪 | German |
| it | 🇮🇹 | Italian |
| pt | 🇵🇹 | Portuguese |
| other | 🌐 | Unknown |

## Usage
\`\`\`html
<app-language-flag [languageCode]="'en'" />
<app-language-flag [languageCode]="'es'" [showName]="true" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    languageCode: {
      description: 'ISO 639-1 language code',
      control: { type: 'select' },
      options: ['en', 'es', 'fr', 'de', 'it', 'pt'],
    },
    showName: {
      description: 'Whether to show the language name next to the flag',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<LanguageFlagComponent>;

export const English: Story = {
  args: {
    languageCode: 'en',
    showName: false,
  },
};

export const Spanish: Story = {
  args: {
    languageCode: 'es',
    showName: false,
  },
};

export const French: Story = {
  args: {
    languageCode: 'fr',
    showName: false,
  },
};

export const German: Story = {
  args: {
    languageCode: 'de',
    showName: false,
  },
};

export const Italian: Story = {
  args: {
    languageCode: 'it',
    showName: false,
  },
};

export const Portuguese: Story = {
  args: {
    languageCode: 'pt',
    showName: false,
  },
};

export const WithName: Story = {
  args: {
    languageCode: 'en',
    showName: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Flag with language name displayed.',
      },
    },
  },
};

export const AllLanguages: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <app-language-flag [languageCode]="'en'" [showName]="true" />
        <app-language-flag [languageCode]="'es'" [showName]="true" />
        <app-language-flag [languageCode]="'fr'" [showName]="true" />
        <app-language-flag [languageCode]="'de'" [showName]="true" />
        <app-language-flag [languageCode]="'it'" [showName]="true" />
        <app-language-flag [languageCode]="'pt'" [showName]="true" />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'All supported language flags with names.',
      },
    },
  },
};

export const FlagsOnly: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 0.5rem;">
        <app-language-flag [languageCode]="'en'" />
        <app-language-flag [languageCode]="'es'" />
        <app-language-flag [languageCode]="'fr'" />
        <app-language-flag [languageCode]="'de'" />
        <app-language-flag [languageCode]="'it'" />
        <app-language-flag [languageCode]="'pt'" />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Compact view with flags only (names shown in tooltip on hover).',
      },
    },
  },
};

export const Undefined: Story = {
  args: {
    languageCode: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders nothing when languageCode is undefined.',
      },
    },
  },
};
