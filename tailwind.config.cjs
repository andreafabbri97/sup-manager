module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f8ff',
          100: '#e6f0ff',
          200: '#cfe0ff',
          300: '#9fc7ff',
          400: '#66aefc',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554'
        },
        neutral: {
          100: '#f5f6f8',
          200: '#e9eef3',
          300: '#d1d9e2',
          400: '#98a3b3',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#0b1220'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
}
