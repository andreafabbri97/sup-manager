import React, { useEffect, useState } from 'react'

export default function InstallButton({ inline = false }: { inline?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [visible, setIsVisible] = useState(false)

  useEffect(() => {
    const beforeHandler = (e: any) => {
      e.preventDefault()
      // keep a global reference so components mounted later can see it
      ;(window as any).__deferredPWAInstall = e
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    const appInstalled = () => {
      setIsInstalled(true)
      setIsVisible(false)
      ;(setDeferredPrompt as any)(null)
      ;(window as any).__deferredPWAInstall = null
    }

    window.addEventListener('beforeinstallprompt', beforeHandler)
    window.addEventListener('appinstalled', appInstalled)

    // check if already installed
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    if (isStandalone || isIOSStandalone) setIsInstalled(true)

    // if the beforeinstallprompt event already fired earlier, a global handler may have stored it
    const globalDp = (window as any).__deferredPWAInstall
    if (globalDp) {
      setDeferredPrompt(globalDp)
      setIsVisible(true)
    }

    // Listen to custom events from the global PWA helper so we react
    // irrespective of component mount order
    const onDeferred = () => {
      const g = (window as any).__deferredPWAInstall
      if (g) {
        setDeferredPrompt(g)
        setIsVisible(true)
      }
    }
    const onInstalled = () => {
      setIsInstalled(true)
      setIsVisible(false)
      ;(setDeferredPrompt as any)(null)
    }

    window.addEventListener('pwa:deferred', onDeferred)
    window.addEventListener('pwa:installed', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeHandler)
      window.removeEventListener('appinstalled', appInstalled)
      window.removeEventListener('pwa:deferred', onDeferred)
      window.removeEventListener('pwa:installed', onInstalled)
    }
  }, [])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (!deferredPrompt) return
    try {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice && choice.outcome === 'accepted') {
        setIsInstalled(true)
        setIsVisible(false)
      }
      setDeferredPrompt(null)
    } catch (err) {
      console.error('PWA prompt failed', err)
    }
  }

  // Inline mode: show a regular button inside layout (disabled if not available)
  if (inline) {
    return (
      <div>
        <button
          aria-label="Installa app"
          onClick={handleClick}
          title={deferredPrompt ? 'Installa Sup Manager' : 'Installazione non disponibile in questo browser'}
          disabled={!deferredPrompt || isInstalled}
          className={`px-3 py-2 rounded ${(!deferredPrompt || isInstalled) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
        >
          {isInstalled ? 'App installata' : 'Installa Sup Manager'}
        </button>
        {!deferredPrompt && !isInstalled && (
          <div className="text-xs text-neutral-500 mt-2">Installazione disponibile solo su browser che supportano PWA (Chrome, Edge, Android WebView).</div>
        )}
      </div>
    )
  }

  if (isInstalled || !visible) return null

  return (
    <button
      aria-label="Installa app"
      onClick={handleClick}
      title="Installa Sup Manager"
      className="fixed top-4 right-4 w-10 h-10 bg-white dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center z-50 hover:shadow-lg transition"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-neutral-800 dark:text-neutral-100">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4 4 4" />
        <rect x="3" y="17" width="18" height="4" rx="1" strokeWidth={2} />
      </svg>
    </button>
  )
}
