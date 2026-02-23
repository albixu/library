import type { Meta, StoryObj } from '@storybook/angular';
import { FooterComponent } from './footer.component';

const meta: Meta<FooterComponent> = {
  title: 'Layout/Footer',
  component: FooterComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Application footer with copyright and GitHub link.

## Features
- Copyright text with year
- Separator dot
- GitHub link with security attributes (target="_blank", rel="noopener noreferrer")
- Centered layout
- Theme-aware styling with smooth transitions

## Usage
\`\`\`html
<app-footer />
\`\`\`

## Content
| Element | Value |
|---------|-------|
| Copyright | © 2025 Library |
| Link | GitHub → https://github.com/albixu/library |
| Link security | target="_blank", rel="noopener noreferrer" |

## Accessibility
- External link opens in new tab with appropriate security attributes
- Focus visible styles for keyboard navigation
        `,
      },
    },
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<FooterComponent>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default footer with copyright and GitHub link.',
      },
    },
  },
};

export const DarkTheme: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Footer appearance in dark theme.',
      },
    },
  },
};

export const LightTheme: Story = {
  parameters: {
    backgrounds: { default: 'light' },
    docs: {
      description: {
        story: 'Footer appearance in light theme.',
      },
    },
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Footer on mobile viewport (same centered layout).',
      },
    },
  },
};
