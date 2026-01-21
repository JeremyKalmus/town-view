import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background colors - using CSS variables for theme switching
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        // Border colors
        border: {
          DEFAULT: 'var(--border)',
          accent: 'var(--border-accent)',
        },
        // Text colors
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        // Status colors (Mad Max inspired)
        status: {
          open: '#3B82F6',       // Ice Blue (spec: open=blue)
          'in-progress': '#F59E0B', // Chrome Amber (spec: yellow)
          blocked: '#B91C1C',    // Blood Rust (spec: red)
          closed: '#22C55E',     // Witness Green (spec: green)
          deferred: '#71717A',   // Zinc (swapped with open)
        },
        // Priority colors
        priority: {
          p0: '#DC2626',  // Critical - Red
          p1: '#F97316',  // High - Orange
          p2: '#EAB308',  // Medium - Yellow
          p3: '#3B82F6',  // Low - Blue
          p4: '#6B7280',  // Minimal - Gray
        },
        // Accent colors (Mad Max theme)
        accent: {
          rust: 'var(--accent-rust)',
          chrome: 'var(--accent-chrome)',
          oil: '#1C1C1C',
          sand: '#C2B280',
          warning: '#FACC15',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Oswald', 'Bebas Neue', 'sans-serif'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        display: ['32px', { lineHeight: '40px' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
        'glow-rust': '0 0 20px rgba(183, 65, 14, 0.3)',
        'glow-chrome': '0 0 20px rgba(192, 192, 192, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in': 'slideIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'flash-update': 'flashUpdate 1.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        flashUpdate: {
          '0%': { backgroundColor: 'rgba(245, 158, 11, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}

export default config
