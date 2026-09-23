/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#0a0f1d',
        surface: {
          DEFAULT: '#0b1326',
          dim: '#0b1326',
          bright: '#31394d',
          card: '#111827',
          elevated: '#1e293b',
          lowest: '#060e20',
          low: '#131b2e',
          container: '#171f33',
          high: '#222a3d',
          highest: '#2d3449',
          variant: '#2d3449',
        },
        on: {
          surface: '#dae2fd',
          'surface-variant': '#c2c6d6',
          primary: '#002e6a',
          secondary: '#003824',
          tertiary: '#003640',
        },
        primary: {
          DEFAULT: '#adc6ff',
          container: '#4d8eff',
        },
        secondary: {
          DEFAULT: '#4edea3',
          container: '#00a572',
        },
        tertiary: {
          DEFAULT: '#4cd7f6',
          container: '#009eb9',
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#34d399',
          blue: '#60a5fa',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        border: {
          subtle: '#1e293b',
          active: '#334155',
        },
        outline: {
          DEFAULT: '#8c909f',
          variant: '#424754',
        },
        diagnostic: {
          amber: '#f59e0b',
          red: '#ef4444',
        },
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