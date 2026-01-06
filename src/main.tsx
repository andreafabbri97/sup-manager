import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
// Initialize global PWA listener as early as possible so the
// `beforeinstallprompt` event is captured even before React mounts.
import './lib/pwa'
import { ThemeProvider } from './lib/theme'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
