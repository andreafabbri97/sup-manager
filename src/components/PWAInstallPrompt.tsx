import React, { useEffect, useState } from 'react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    
    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true)
      return
    }

    // Check if user already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show prompt after 10 seconds
      setTimeout(() => setShowPrompt(true), 10000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('PWA installata')
      setIsInstalled(true)
    }
    
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  function handleDismiss() {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-sm app-card p-4 z-50 animate-fade-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        aria-label="Chiudi"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Installa l'app
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Aggiungi Sup Manager alla tua schermata home per un accesso più rapido!
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition"
            >
              Installa
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition"
            >
              Non ora
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
