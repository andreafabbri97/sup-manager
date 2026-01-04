import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using relative base to make GitHub Pages deploy easier across repos
export default defineConfig({
  plugins: [react()],
  base: './'
})