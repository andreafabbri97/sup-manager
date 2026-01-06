// Global PWA helper: capture beforeinstallprompt as early as possible
// and expose it via window.__deferredPWAInstall. Also dispatches
// custom events so components can react when the prompt becomes
// available or when the app is installed.

function onBeforeInstallPrompt(e: any) {
  try {
    e.preventDefault()
  } catch (err) {}
  ;(window as any).__deferredPWAInstall = e
  // dispatch a custom event so any listener can activate immediately
  window.dispatchEvent(new CustomEvent('pwa:deferred'))
}

function onAppInstalled() {
  ;(window as any).__deferredPWAInstall = null
  window.dispatchEvent(new CustomEvent('pwa:installed'))
}

window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
window.addEventListener('appinstalled', onAppInstalled)

// Expose a small helper (optional) for other modules
export const pwa = {
  getDeferredPrompt: () => (window as any).__deferredPWAInstall || null,
}
