import type { Meta, StoryObj } from '@storybook/angular';
import { LoadingOverlayComponent } from './loading-overlay.component';

const meta: Meta<LoadingOverlayComponent> = {
  title: 'Catalog/Table/LoadingOverlay',
  component: LoadingOverlayComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Semi-transparent overlay with spinner for loading states.

## Features
- Configurable spinner diameter
- Optional loading message
- Transparent mode for subtle loading indication
- Fully accessible with ARIA attributes

## Usage
\`\`\`html
<div style="position: relative;">
  <app-loading-overlay [visible]="isLoading" />
  <!-- Content here -->
</div>

<app-loading-overlay [visible]="true" message="Loading books..." />
<app-loading-overlay [visible]="true" [diameter]="64" />
<app-loading-overlay [visible]="true" [transparent]="true" />
\`\`\`

## Important
The parent container must have \`position: relative\` for the overlay to position correctly.
        `,
      },
    },
  },
  argTypes: {
    visible: {
      description: 'Controls overlay visibility',
      control: { type: 'boolean' },
    },
    message: {
      description: 'Optional loading message displayed below spinner',
      control: { type: 'text' },
    },
    diameter: {
      description: 'Spinner diameter in pixels',
      control: { type: 'number' },
    },
    transparent: {
      description: 'Use transparent background instead of semi-opaque',
      control: { type: 'boolean' },
    },
  },
  decorators: [
    (story) => ({
      template: `
        <div style="position: relative; height: 300px; border-radius: 8px;" [attr.data-theme]="'dark'">
          <div style="padding: 1rem; background-color: rgb(30 41 59); border-radius: 8px; height: 100%;">
            <p style="color: rgb(241 245 249); margin: 0 0 0.5rem;">Sample content behind the overlay</p>
            <p style="color: rgb(148 163 184); margin: 0;">This demonstrates how the overlay covers content.</p>
          </div>
          ${story().template || '<app-loading-overlay [visible]="visible" [message]="message" [diameter]="diameter" [transparent]="transparent" />'}
        </div>
      `,
      props: story().props,
    }),
  ],
};

export default meta;
type Story = StoryObj<LoadingOverlayComponent>;

export const Default: Story = {
  args: {
    visible: true,
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Overlay hidden when visible is false.',
      },
    },
  },
};

export const WithMessage: Story = {
  args: {
    visible: true,
    message: 'Loading books...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays a message below the spinner.',
      },
    },
  },
};

export const LargeSpinner: Story = {
  args: {
    visible: true,
    diameter: 64,
  },
  parameters: {
    docs: {
      description: {
        story: 'Larger spinner for more prominent loading indication.',
      },
    },
  },
};

export const SmallSpinner: Story = {
  args: {
    visible: true,
    diameter: 32,
  },
  parameters: {
    docs: {
      description: {
        story: 'Smaller spinner for subtle loading indication.',
      },
    },
  },
};

export const Transparent: Story = {
  args: {
    visible: true,
    transparent: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Transparent background for subtle loading overlay.',
      },
    },
  },
};

export const FullFeatured: Story = {
  args: {
    visible: true,
    message: 'Searching your library...',
    diameter: 56,
  },
  parameters: {
    docs: {
      description: {
        story: 'Full featured loading overlay with message and custom spinner size.',
      },
    },
  },
};
