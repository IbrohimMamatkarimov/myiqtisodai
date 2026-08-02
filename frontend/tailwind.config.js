/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colors that switch between light/dark are driven by CSS variables
        // (see globals.css :root / .dark) so every bg-X / text-X / border-X/[n]
        // utility using them automatically reacts to the `dark` class.
        bgpage: 'rgb(var(--color-bgpage) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        textmain: 'rgb(var(--color-textmain) / <alpha-value>)',
        textmuted: 'rgb(var(--color-textmuted) / <alpha-value>)',

        // Fixed accent/utility colors - intentionally the same in both themes.
        bgdark: '#1F3044',
        primary: '#16A34A',
        secondary: '#7DA2A9',
        accentx: '#7DA2A9',
        danger: '#EF4444',
        warning: '#6B7280',

        coral: {
          500: '#EF4444',
        },
      },

      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui'],
        tabular: ['var(--font-body)', 'ui-monospace', 'monospace'],
      },

      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        card: '0 1px 3px rgba(31,48,68,0.06), 0 1px 2px rgba(31,48,68,0.04)',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.4)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },

      animation: {
        'fade-up': 'fade-up .45s ease-out both',
        'pop-in': 'pop-in .7s cubic-bezier(0.34,1.56,0.64,1) both',
        'progress-fill': 'progress-fill 3.2s linear forwards',
      },
    },
  },

  plugins: [],
};
