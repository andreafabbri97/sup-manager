import React, { useCallback, useState } from 'react'
import Sidebar from './components/Sidebar'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Equipment from './components/Equipment'
import Bookings from './components/Bookings'
import Packages from './components/Packages'
import Customers from './components/Customers'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import InstallButton from './components/InstallButton'
import TopBar from './components/TopBar'
import Archive from './pages/Archive'

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
      // always switch to bookings page, then re-dispatch the event shortly after
      setPage('bookings')
      try { window.localStorage.setItem('app_page', 'bookings') } catch (e) {}
      // re-dispatch so Bookings component (mounted after page change) can handle it
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate:booking', { detail }))
      }, 240)
    }
    window.addEventListener('navigate:booking', onNavigateReq)
    return () => window.removeEventListener('navigate:booking', onNavigateReq)
  }, [])

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex">
      <Sidebar onNav={handleNav} currentPage={page} />
      <main className="flex-1 flex flex-col w-full">
        <TopBar />
        <div className="px-2 sm:px-4 lg:px-6 py-0 sm:py-0 flex-1">
          {page === 'equipment' && <Equipment />}
          {page === 'bookings' && <Bookings />}
          {page === 'packages' && <Packages />}
          {page === 'customers' && <Customers />}
          {page === 'reports' && <Reports />}
          {page === 'archive' && <Archive />}
          {page === 'settings' && <Settings />}
          {!['equipment','bookings','packages','customers','reports','settings','archive'].includes(page) && <Reports />}
        </div>
      </main>
      <PWAInstallPrompt />
      <InstallButton />
    </div>
  )
}