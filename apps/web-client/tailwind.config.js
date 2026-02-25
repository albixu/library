/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,ts}', // Include all HTML and TS files
  ],
  darkMode: ['class', '[data-theme="dark"]'], // Support both class and attribute-based dark mode
  theme: {
    extend: {
      // Typography
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
      },

      // Primary color palette
      colors: {
        // Primary accent color from design
        primary: {
          DEFAULT: '#17a1cf',
          hover: '#1493c0',
          active: '#1082ab',
        },

        // Background colors
        background: {
          primary: '#f6f7f8', // Light mode default
          surface: '#ffffff',
          elevated: '#ffffff',
          input: '#f8fafc', // slate-50
          'dark-primary': '#111d21', // Dark mode primary
          'dark-surface': '#0f172a', // slate-900
          'dark-elevated': '#1e293b', // slate-800
          'dark-input': '#0f172a', // slate-900
        },

        // Semantic colors
        success: {
          light: '#22c55e',
          dark: '#4ade80',
        },
        warning: {
          light: '#f59e0b',
          dark: '#fbbf24',
        },
        error: {
          light: '#ef4444',
          dark: '#f87171',
        },
        info: {
          light: '#3b82f6',
          dark: '#60a5fa',
        },

        // Level badge colors
        level: {
          beginner: {
            bg: {
              light: '#dcfce7',
              dark: 'rgba(20, 83, 45, 0.3)',
            },
            text: {
              light: '#15803d',
              dark: '#4ade80',
            },
          },
          intermediate: {
            bg: {
              light: '#fef3c7',
              dark: 'rgba(120, 53, 15, 0.3)',
            },
            text: {
              light: '#b45309',
              dark: '#fbbf24',
            },
          },
          advanced: {
            bg: {
              light: '#fee2e2',
              dark: 'rgba(127, 29, 29, 0.3)',
            },
            text: {
              light: '#b91c1c',
              dark: '#f87171',
            },
          },
          expert: {
            bg: {
              light: '#f3e8ff',
              dark: 'rgba(88, 28, 135, 0.3)',
            },
            text: {
              light: '#7e22ce',
              dark: '#c084fc',
            },
          },
        },
      },

      // Border radius
      borderRadius: {
        sm: '0.25rem', // 4px
        md: '0.5rem', // 8px
        lg: '0.75rem', // 12px
        xl: '1rem', // 16px
      },

      // Spacing extensions (if needed beyond Tailwind defaults)
      spacing: {
        18: '4.5rem', // 72px
        22: '5.5rem', // 88px
      },

      // Box shadows matching design
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
        dropdown: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },

      // Animation speeds
      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '350ms',
      },

      // Z-index layers
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modal: '1040',
        popover: '1050',
        tooltip: '1060',
      },
    },
  },
  plugins: [],
};
