/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#d97706',
          600: '#d97706',
        },
        accentText: '#fbbf24',
        navy: {
          950: '#071629',
          800: '#102a43',
          700: '#173857',
          600: '#21496d',
        },
        ink: {
          DEFAULT: '#dcecf5',
          soft: '#dcecf5',
          muted: '#93a7bc',
        },
        danger: '#ff8fa0',
      },
      boxShadow: {
        neumorphic: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'neumorphic-inset': 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -1px 0 rgba(255, 255, 255, 0.02)',
        glow: '0 0 20px rgba(217, 119, 6, 0.35)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.3s ease-out',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
