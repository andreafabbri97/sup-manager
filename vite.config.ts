import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config: unified export with base and manualChunks
export default defineConfig({
  // Using relative base to make GitHub Pages deploy easier across repos
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
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