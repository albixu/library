import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HeaderComponent } from './header.component';

const meta: Meta<HeaderComponent> = {
  title: 'Layout/Header',
  component: HeaderComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Application header with logo, title, and user menu.

## Features
- Sticky positioning at the top of the viewport
- Logo with auto_stories Material icon in cyan container
- "BiblioManager" title with bold styling and tracking-tight letter spacing
- User avatar / login button on the right side

## Usage
\`\`\`html
<app-header />
\`\`\`

## Design Specifications
| Element | Style |
|---------|-------|
| Logo container | 40x40px, border-radius: 8px, background: accent color |
| Logo icon | auto_stories, 24px, white |
| Title | 1.25rem, font-weight: 700, letter-spacing: -0.025em |
| Position | sticky, top: 0, z-index: sticky |
        `,
      },
    },
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<HeaderComponent>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default header with logo and title in dark mode.',
      },
    },
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Header on mobile viewport (same layout, responsive padding).',
      },
    },
  },
};
