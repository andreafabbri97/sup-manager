import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Basic manualChunks to split vendor bundles (React, chart.js)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts'
            return 'vendor'
          }
        }
      }
    }
  }
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using relative base to make GitHub Pages deploy easier across repos
export default defineConfig({
  plugins: [react()],
  base: './'
})