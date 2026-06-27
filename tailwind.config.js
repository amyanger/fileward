/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F6F8',
        surface: '#FFFFFF',
        ink: '#12161C',
        muted: '#59616E',
        faint: '#8A93A1',
        line: '#E5E8EC',
        accent: {
          DEFAULT: '#0C7268',
          hover: '#0A5F56',
          soft: '#E4F2EF',
        },
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightish: '-0.02em',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 22, 28, 0.04), 0 1px 1px rgba(18, 22, 28, 0.03)',
        lift: '0 6px 24px -8px rgba(18, 22, 28, 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
    },
  },
  plugins: [],
}
