import type { Config } from 'tailwindcss';

/**
 * Design tokens — mirrors src/index.css :root vars.
 * Both layers must stay in sync. Tailwind utilities consume `theme.extend`,
 * D3 inline attrs / JS computed values consume CSS vars.
 *
 * Reference: docs/re-design_specs/01-design-tokens.md
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        muted: 'var(--bg-muted)',
        inverse: 'var(--bg-inverse)',

        // Text
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
        disabled: 'var(--text-disabled)',
        'on-brand': 'var(--text-on-brand)',

        // Border (use via border-{token})
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',

        // Brand teal scale
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          active: 'var(--brand-active)',
          subtle: 'var(--brand-subtle)',
          'subtle-2': 'var(--brand-subtle-2)',
          border: 'var(--brand-border)',
        },

        // Semantic
        success: {
          DEFAULT: 'var(--success)',
          subtle: 'var(--success-subtle)',
          border: 'var(--success-border)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          subtle: 'var(--warning-subtle)',
          border: 'var(--warning-border)',
        },
        error: {
          DEFAULT: 'var(--error)',
          subtle: 'var(--error-subtle)',
          border: 'var(--error-border)',
        },
        info: {
          DEFAULT: 'var(--info)',
          subtle: 'var(--info-subtle)',
          border: 'var(--info-border)',
        },

        // Anomaly grades (chart + UI)
        anomaly: {
          high: 'var(--anomaly-high)',
          'high-bg': 'var(--anomaly-high-bg)',
          'high-border': 'var(--anomaly-high-border)',
          medium: 'var(--anomaly-medium)',
          'medium-bg': 'var(--anomaly-medium-bg)',
          'medium-border': 'var(--anomaly-medium-border)',
          reference: 'var(--anomaly-reference)',
          'reference-bg': 'var(--anomaly-reference-bg)',
          'reference-border': 'var(--anomaly-reference-border)',
        },
      },

      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },

      fontSize: {
        // Semantic role names — sizes from 01-design-tokens.md §9
        nano: ['11px', { lineHeight: '14px', letterSpacing: '0.08em', fontWeight: '600' }],
        micro: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        caption: ['13px', { lineHeight: '18px' }],
        body: ['14px', { lineHeight: '20px' }],
        subhead: ['14px', { lineHeight: '20px', fontWeight: '600' }],
        heading: ['18px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        display: ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
      },

      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        pill: 'var(--r-pill)',
      },

      boxShadow: {
        e1: 'var(--e1)',
        e2: 'var(--e2)',
        e3: 'var(--e3)',
        e4: 'var(--e4)',
        e5: 'var(--e5)',
        'brand-cta':
          '0 4px 12px rgba(13, 148, 136, 0.24), 0 1px 3px rgba(13, 148, 136, 0.16)',
        'brand-fab':
          '0 8px 24px rgba(13, 148, 136, 0.32), 0 2px 6px rgba(13, 148, 136, 0.18)',
        'brand-fab-hover':
          '0 12px 32px rgba(13, 148, 136, 0.4), 0 4px 8px rgba(13, 148, 136, 0.22)',
        'ring-brand': '0 0 0 2px var(--bg-canvas), 0 0 0 4px var(--brand)',
      },

      transitionDuration: {
        instant: '0ms',
        fast: '100ms',
        DEFAULT: '180ms',
        emph: '240ms',
        slow: '400ms',
      },

      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        emph: 'var(--ease-emph)',
      },

      letterSpacing: {
        tight: '-0.01em',
        wider: '0.08em',
        widest: '0.1em',
      },

      keyframes: {
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(-2px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'scale-in': 'scale-in 240ms var(--ease-emph)',
      },
    },
  },
  plugins: [],
};

export default config;
