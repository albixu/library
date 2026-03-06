import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ThemeService } from '@core/services/theme.service';
import { signal, computed } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';

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

const meta: Meta<MainLayoutComponent> = {
  title: 'Layout/MainLayout',
  component: MainLayoutComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync(), provideRouter([])],
    }),
    moduleMetadata({
      providers: [{ provide: ThemeService, useFactory: () => createMockThemeService() }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Main application layout wrapper component.

## Features
- Header with logo and theme toggle at the top
- Main content area with router-outlet
- Footer with copyright and GitHub link at the bottom
- Flexbox layout with min-height: 100vh
- Content area grows to fill available space

## Structure
\`\`\`
┌────────────────────────────────┐
│          app-header            │
├────────────────────────────────┤
│                                │
│         <router-outlet>        │
│           (content)            │
│                                │
├────────────────────────────────┤
│          app-footer            │
└────────────────────────────────┘
\`\`\`

## Usage
Used as the root layout in routing configuration:
\`\`\`typescript
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // child routes...
    ],
  },
];
\`\`\`

## Styling
| Property | Value |
|----------|-------|
| Display | flex, column direction |
| Min height | 100vh |
| Content area | flex: 1 (grows to fill space) |
        `,
      },
    },
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<MainLayoutComponent>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default main layout with header, content area, and footer.',
      },
    },
  },
};

export const WithContent: Story = {
  render: () => ({
    template: `
      <div class="main-layout" style="display: flex; flex-direction: column; min-height: 100vh;">
        <app-header />
        <main style="flex: 1; padding: 2rem; background: var(--color-bg-primary);">
          <h1 style="color: var(--color-text-primary);">Page Content</h1>
          <p style="color: var(--color-text-secondary);">
            This is where the page content would be rendered via router-outlet.
          </p>
        </main>
        <app-footer />
      </div>
    `,
  }),
  decorators: [
    moduleMetadata({
      imports: [MainLayoutComponent],
    }),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Layout with sample content to demonstrate the full structure.',
      },
    },
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Main layout on mobile viewport.',
      },
    },
  },
};
