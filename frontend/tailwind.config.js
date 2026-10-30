/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hyperion': {
          50: '#f0f4ff',
          100: '#d0e0ff',
          200: '#a0bfff',
          300: '#709eff',
          400: '#4080ff',
          500: '#0060df',
          600: '#004eb0',
          700: '#003c80',
          800: '#002a50',
          900: '#001820'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      spacing: {
        '128': '32rem',
        '144': '36rem'
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem'
      }
    }
  },
  plugins: []
}
