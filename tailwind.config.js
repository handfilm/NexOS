/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./js/**/*.{js,ts}"
  ],
  darkMode: 'class',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-neu)',
        foreground: 'var(--ink)',
        surface: {
          DEFAULT: 'var(--surface)',
          card: 'var(--surface-card)',
          light: 'var(--bg-neu-light)',
          dark: 'var(--bg-neu-dark)'
        },
        coral: {
          DEFAULT: 'var(--coral)',
          bright: 'var(--coral-bright)',
          dark: 'var(--coral-dark)',
          glow: 'var(--coral-glow)'
        },
        gold: {
          DEFAULT: 'var(--gold)',
          dim: 'var(--gold-dim)',
          glow: 'var(--gold-glow)'
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-2)',
          subtle: 'var(--ink-3)',
          faint: 'var(--ink-4)'
        },
        wire: {
          DEFAULT: 'var(--wire)',
          hard: 'var(--wire-hard)'
        }
      }
    }
  },
  plugins: []
};
