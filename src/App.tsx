import React, { useCallback, useState } from 'react'
import Sidebar from './components/Sidebar'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Equipment from './components/Equipment'
import Bookings from './components/Bookings'
import Packages from './components/Packages'
import Customers from './components/Customers'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import TopBar from './components/TopBar'
import Archive from './pages/Archive'
import People from './pages/People'
import Login from './pages/Login'
import Users from './pages/Users'
import Payroll from './pages/Payroll'
import Toasts from './components/Toasts'

export default function App() {
  const [page, setPage] = useState<string>(() => {
    if (typeof window === 'undefined') return 'reports'
    try { return window.localStorage.getItem('app_page') || 'reports' } catch (e) { return 'reports' }
  })
  const handleNav = useCallback((p: string) => {
    setPage(p)
    try { window.localStorage.setItem('app_page', p) } catch (e) {}
  }, [])

  // Listen to global navigate events (e.g. from NotificationBell)
  React.useEffect(() => {
    const onNavigateReq = (ev: any) => {
      const detail = ev?.detail || {}
      // Prevent redispatch loops: if this event was already forwarded, do not forward again
      if (detail.__forwarded) {
        setPage('bookings')
        try { window.localStorage.setItem('app_page', 'bookings') } catch (e) {}
        return
      }

      // Switch to bookings page and re-dispatch once with a forwarded flag so the Bookings component
      // (which may mount after the page change) receives the request only once.
      setPage('bookings')
      try { window.localStorage.setItem('app_page', 'bookings') } catch (e) {}

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate:booking', { detail: { ...detail, __forwarded: true } }))
      }, 240)
    }
    window.addEventListener('navigate:booking', onNavigateReq)

    const onNavLogin = () => { setPage('login'); try { window.localStorage.setItem('app_page', 'login') } catch (e) {} }
    window.addEventListener('navigate:login', onNavLogin as any)

    return () => {
      window.removeEventListener('navigate:booking', onNavigateReq)
      window.removeEventListener('navigate:login', onNavLogin as any)
    }
  }, [])

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  React.useEffect(() => {
    // Redirect based on authentication/role
    let mounted = true
    ;(async () => {
      try {
        const { getCurrentUserRole } = await import('./lib/auth')
        const role = await getCurrentUserRole()
        if (!mounted) return
        setIsAuthenticated(role !== null)
        if (role === null) {
          handleNav('login')
          return
        }
        if (role === 'staff' && page === 'reports') {
          handleNav('bookings')
        }
      } catch (e) {
        // ignore
        setIsAuthenticated(false)
        handleNav('login')
      }
    })()

    const onAuthChanged = async () => {
      const { getCurrentUserRole } = await import('./lib/auth')
      const role = await getCurrentUserRole()
      setIsAuthenticated(role !== null)
      if (!role) handleNav('login')
    }
    window.addEventListener('auth:changed', onAuthChanged as any)

    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged as any) }
  }, [])

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex">
      <Sidebar onNav={handleNav} currentPage={page} />
      <main className="flex-1 flex flex-col w-full">
        <TopBar />
        <div className="px-2 sm:px-4 lg:px-6 py-0 sm:py-0 flex-1">
          {isAuthenticated === false ? (
            <Login />
          ) : (
            <>
              {page === 'equipment' && <Equipment />}
              {page === 'bookings' && <Bookings />}
              {page === 'packages' && <Packages />}
              {page === 'customers' && <Customers />}
              {page === 'people' && <People />}
              {page === 'users' && <Users />}
              {page === 'login' && <Login />}
              {page === 'payroll' && <Payroll />}
              {page === 'reports' && <Reports />}
              {page === 'archive' && <Archive />}
              {page === 'settings' && <Settings />}
              {!['equipment','bookings','packages','customers','people','reports','settings','archive','users','login'].includes(page) && <Reports /> }
            </>
          )}
        </div>
      </main>

      <PWAInstallPrompt />
      <Toasts />
    </div>
  )
}