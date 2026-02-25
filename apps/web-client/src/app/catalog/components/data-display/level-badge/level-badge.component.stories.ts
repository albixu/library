import type { Meta, StoryObj } from '@storybook/angular';
import { LevelBadgeComponent } from './level-badge.component';

const meta: Meta<LevelBadgeComponent> = {
  title: 'Catalog/Data Display/LevelBadge',
  component: LevelBadgeComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Displays a book's difficulty level as a colored badge.

## Level Colors
| Level | Light Mode | Dark Mode |
|-------|------------|-----------|
| Beginner | Green (bg-green-100, text-green-700) | Green (bg-green-900/30, text-green-400) |
| Intermediate | Amber (bg-amber-100, text-amber-700) | Amber (bg-amber-900/30, text-amber-400) |
| Advanced | Red (bg-red-100, text-red-700) | Red (bg-red-900/30, text-red-400) |
| Beginner to intermediate | Blue (bg-blue-100, text-blue-700) | Blue (bg-blue-900/30, text-blue-400) |
| Intermediate to advanced | Purple (bg-purple-100, text-purple-700) | Purple (bg-purple-900/30, text-purple-400) |

## Usage
\`\`\`html
<app-level-badge [level]="'Beginner'" />
<app-level-badge [level]="book.level" />
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    level: {
      description: 'The difficulty level of the book',
      control: { type: 'select' },
      options: [
        'Beginner',
        'Intermediate',
        'Advanced',
        'Beginner to intermediate',
        'Intermediate to advanced',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<LevelBadgeComponent>;

export const Beginner: Story = {
  args: {
    level: 'Beginner',
  },
  parameters: {
    docs: {
      description: {
        story: 'Green badge for beginner-level content.',
      },
    },
  },
};

export const Intermediate: Story = {
  args: {
    level: 'Intermediate',
  },
  parameters: {
    docs: {
      description: {
        story: 'Amber badge for intermediate-level content.',
      },
    },
  },
};

export const Advanced: Story = {
  args: {
    level: 'Advanced',
  },
  parameters: {
    docs: {
      description: {
        story: 'Red badge for advanced-level content.',
      },
    },
  },
};

export const BeginnerToIntermediate: Story = {
  args: {
    level: 'Beginner to intermediate',
  },
  parameters: {
    docs: {
      description: {
        story: 'Blue badge for beginner to intermediate transition content.',
      },
    },
  },
};

export const IntermediateToAdvanced: Story = {
  args: {
    level: 'Intermediate to advanced',
  },
  parameters: {
    docs: {
      description: {
        story: 'Purple badge for intermediate to advanced transition content.',
      },
    },
  },
};

export const AllLevels: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <app-level-badge [level]="'Beginner'" />
        <app-level-badge [level]="'Intermediate'" />
        <app-level-badge [level]="'Advanced'" />
        <app-level-badge [level]="'Beginner to intermediate'" />
        <app-level-badge [level]="'Intermediate to advanced'" />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'All level badges displayed together for comparison.',
      },
    },
  },
};

export const Undefined: Story = {
  args: {
    level: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders nothing when level is undefined.',
      },
    },
  },
};

export const Null: Story = {
  args: {
    level: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders nothing when level is null.',
      },
    },
  },
};
