/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          dim: 'rgb(var(--surface-dim) / <alpha-value>)',
          bright: 'rgb(var(--surface-bright) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          lowest: 'rgb(var(--surface-lowest) / <alpha-value>)',
          low: 'rgb(var(--surface-low) / <alpha-value>)',
          container: 'rgb(var(--surface-container) / <alpha-value>)',
          high: 'rgb(var(--surface-high) / <alpha-value>)',
          highest: 'rgb(var(--surface-highest) / <alpha-value>)',
          variant: 'rgb(var(--surface-variant) / <alpha-value>)',
        },
        on: {
          surface: 'rgb(var(--on-surface) / <alpha-value>)',
          'surface-variant': 'rgb(var(--on-surface-variant) / <alpha-value>)',
          primary: 'rgb(var(--on-primary) / <alpha-value>)',
          secondary: 'rgb(var(--on-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--on-tertiary) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          container: 'rgb(var(--primary-container) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          container: 'rgb(var(--secondary-container) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--tertiary) / <alpha-value>)',
          container: 'rgb(var(--tertiary-container) / <alpha-value>)',
        },
        accent: {
          cyan: 'rgb(var(--accent-cyan) / <alpha-value>)',
          emerald: 'rgb(var(--accent-emerald) / <alpha-value>)',
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        border: {
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          active: 'rgb(var(--border-active) / <alpha-value>)',
        },
        outline: {
          DEFAULT: 'rgb(var(--outline) / <alpha-value>)',
          variant: 'rgb(var(--outline-variant) / <alpha-value>)',
        },
        diagnostic: {
          amber: 'rgb(var(--diagnostic-amber) / <alpha-value>)',
          red: 'rgb(var(--diagnostic-red) / <alpha-value>)',
        },
        // Tokens semánticos para superficies geométricas
        panel: 'rgb(var(--panel) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        inset: 'rgb(var(--inset) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-sub': 'rgb(var(--line-sub) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        'primary-soft': 'rgb(var(--primary-soft) / <alpha-value>)',
        'primary-mid': 'rgb(var(--primary-mid) / <alpha-value>)',
        'success-soft': 'rgb(var(--success-soft) / <alpha-value>)',
        'brand-soft': 'rgb(var(--brand-soft) / <alpha-value>)',
        'info-soft': 'rgb(var(--info-soft) / <alpha-value>)',
        'warning-soft': 'rgb(var(--warning-soft) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft) / <alpha-value>)',
        'success-fg': 'rgb(var(--success-fg) / <alpha-value>)',
        'brand-fg': 'rgb(var(--brand-fg) / <alpha-value>)',
        'info-fg': 'rgb(var(--info-fg) / <alpha-value>)',
        'warning-fg': 'rgb(var(--warning-fg) / <alpha-value>)',
        'danger-fg': 'rgb(var(--danger-fg) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['System'],
        mono: ['monospace'],
      },
      letterSpacing: {
        tightest: '-0.025em',
      },
    },
  },
  plugins: [],
};