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
          950: '#0F172A',
          900: '#1E293B',
          800: '#334155',
          700: '#475569',
          600: '#64748B',
        },

        cream: {
          50: '#FFFFFF',
          100: '#F9FCFA',
          200: '#ECFDF5',
        },

        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },

        gold: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },

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
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      boxShadow: {
        glass: '0 20px 50px rgba(16,185,129,0.12)',
        'glass-dark': '0 20px 50px rgba(16,185,129,0.20)',
        card: '0 15px 40px rgba(15,23,42,0.08)',
      },

      backdropBlur: {
        xs: '2px',
      },

      keyframes: {
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },

        'count-tick': {
          '0%': {
            opacity: '0.5',
          },
          '100%': {
            opacity: '1',
          },
        },
      },

      animation: {
        'fade-up': 'fade-up .45s ease-out both',
        'count-tick': 'count-tick .3s ease-out',
      },
    },
  },

  plugins: [],
};
