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
        ink: {
          950: '#070B14',
          900: '#0B1220',
          800: '#121B2E',
          700: '#1B2740',
          600: '#2A3A5C',
        },
        cream: {
          50: '#FBF9F4',
          100: '#F5F1E7',
          200: '#EAE3D1',
        },
        gold: {
          400: '#E8C468',
          500: '#D4A93F',
          600: '#B8862A',
        },
        emerald: {
          400: '#3FD68C',
          500: '#22B573',
          600: '#178A58',
        },
        coral: {
          500: '#E15B4E',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui'],
        tabular: ['var(--font-body)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(7, 11, 20, 0.12)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.45)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'count-tick': {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'count-tick': 'count-tick 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
