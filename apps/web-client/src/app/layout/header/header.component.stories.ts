import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ThemeToggleComponent } from '@shared/components/theme-toggle';
import { ThemeService } from '@core/services/theme.service';
import { signal, computed } from '@angular/core';
import { HeaderComponent } from './header.component';

// Mock ThemeService for Storybook
const createMockThemeService = (isDark = true) => {
  const themeSignal = signal<'light' | 'dark'>(isDark ? 'dark' : 'light');
  return {
    theme: themeSignal,
    isDark: computed(() => themeSignal() === 'dark'),
    themeIcon: computed(() => (themeSignal() === 'dark' ? 'light_mode' : 'dark_mode')),
    toggleLabel: computed(() =>
      themeSignal() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    ),
    toggleTheme: () => {
      themeSignal.update((current) => (current === 'light' ? 'dark' : 'light'));
    },
  };
};

const meta: Meta<HeaderComponent> = {
  title: 'Layout/Header',
  component: HeaderComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
    moduleMetadata({
      imports: [ThemeToggleComponent],
      providers: [{ provide: ThemeService, useFactory: () => createMockThemeService() }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Application header with logo, title, and theme toggle.

## Features
- Sticky positioning at the top of the viewport
- Logo with auto_stories Material icon in cyan container
- "Library" title with bold styling and tracking-tight letter spacing
- Theme toggle button on the right side
- Smooth theme transition animations

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
        story: 'Default header with logo, title, and theme toggle in dark mode.',
      },
    },
  },
};

export const DarkTheme: Story = {
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
    moduleMetadata({
      providers: [{ provide: ThemeService, useFactory: () => createMockThemeService(true) }],
    }),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Header appearance in dark theme.',
      },
    },
  },
};

export const LightTheme: Story = {
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
    moduleMetadata({
      providers: [{ provide: ThemeService, useFactory: () => createMockThemeService(false) }],
    }),
  ],
  parameters: {
    backgrounds: { default: 'light' },
    docs: {
      description: {
        story: 'Header appearance in light theme.',
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
