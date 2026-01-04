/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#eef2ff',
          500: '#f59e0b'
        }
      },
      borderRadius: {
        'xl': '1rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        'sm-2': '0 1px 2px rgba(0,0,0,0.04)',
        'soft': '0 6px 18px rgba(15,23,42,0.08)'
      }
    }
  },
  plugins: []
}
