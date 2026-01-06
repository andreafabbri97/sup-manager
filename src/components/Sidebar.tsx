import React from 'react'
import { useTheme } from '../lib/theme'


export default function Sidebar({ onNav, currentPage }: { onNav?: (page: string) => void; currentPage?: string }) {
  const { theme, toggle } = useTheme()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const sidebarRef = React.useRef<HTMLElement | null>(null)

  // focus trap on mobile overlay sidebar
  React.useEffect(() => {
    if (!mobileOpen || !sidebarRef.current) return
    const node = sidebarRef.current
    const focusable = node.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // Listen to a custom event so the TopBar's menu button can toggle the sidebar
  React.useEffect(() => {
    const onToggle = () => setMobileOpen((s) => !s)
    window.addEventListener('sidebar:toggle', onToggle as any)
    return () => window.removeEventListener('sidebar:toggle', onToggle as any)
  }, [])

  // When the sidebar closes, restore focus to the TopBar menu button if present
  const prevMobileOpen = React.useRef<boolean>(mobileOpen)
  React.useEffect(() => {
    // only restore focus when the sidebar was previously open and now closed
    if (prevMobileOpen.current && !mobileOpen) {
      const btn = document.querySelector<HTMLButtonElement>('button[aria-controls="sidebar"]')
      btn?.focus()
    }
    prevMobileOpen.current = mobileOpen
  }, [mobileOpen])

  const items = [
    { id: 'equipment', label: 'Attrezzatura' },
    { id: 'bookings', label: 'Prenotazioni' },
    { id: 'packages', label: 'Pacchetti' },
    { id: 'customers', label: 'Clienti' },
    { id: 'reports', label: 'Amministrazione e Report' },
    { id: 'settings', label: 'Impostazioni' }
  ]

  const Icon = ({ name }: { name: string }) => {
    switch (name) {
      case 'dashboard':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zM13 21h8v-8h-8v8zM13 3v8h8V3h-8zM3 21h8v-8H3v8z" />
          </svg>
        )
      case 'equipment':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v4H9V3zM4 8h16v13H4V8z" />
          </svg>
        )
      case 'bookings':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h10M7 16h10M5 4h14v2H5V4z" />
          </svg>
        )
      case 'packages':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 4.5v9L12 21 3 16.5v-9L12 3zM12 12v8" />
          </svg>
        )
      case 'archive':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7M10 11h4M10 15h4" />
          </svg>
        )
      case 'customers':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        )
      case 'expenses':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2 0-4 1-4 3s2 3 4 3 4-1 4-3-2-3-4-3zM4 19h16" />
          </svg>
        )
      case 'reports':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
          </svg>
        )
      case 'settings':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zM19.4 15a1.98 1.98 0 0 0 .35 2.04l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04a1.98 1.98 0 0 0-2.04-.35 2 2 0 0 1-1.17 1.17c-.7.28-1.47.28-2.17 0a2 2 0 0 1-1.17-1.17 1.98 1.98 0 0 0-2.04.35l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04a1.98 1.98 0 0 0 .35-2.04 2 2 0 0 1-1.17-1.17c-.28-.7-.28-1.47 0-2.17A2 2 0 0 1 3 8.58 1.98 1.98 0 0 0 2.65 6.54L2.61 6.5A2 2 0 0 1 5.44 3.67l.04.04c.7.28 1.47.28 2.17 0a2 2 0 0 1 1.17-1.17c.7-.28 1.47-.28 2.17 0a2 2 0 0 1 1.17 1.17c.28.7.28 1.47 0 2.17A2 2 0 0 1 19.4 8.58c.35.35.7.7.99 1.06z" />
          </svg>
        )
      default:
        return null
    }
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  React.useEffect(() => {
    // Lock body scroll when menu open on mobile
    if (mobileOpen) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
  }, [mobileOpen])

  return (
    <>


      {/* (removed duplicate top-right theme toggle — theme control available in the sidebar) */}

      {/* Backdrop for mobile when menu open */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity lg:hidden ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      />

      <aside
        id="sidebar"
        ref={(el) => (sidebarRef.current = el)}
        className={`fixed z-50 top-0 left-0 h-full ${collapsed ? 'w-20' : 'w-64'} bg-neutral-50 dark:bg-neutral-900 border-r dark:border-neutral-800 p-4 transform transition-all duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 overflow-hidden flex flex-col lg:flex lg:flex-col`}
        aria-hidden={!mobileOpen}
      >
        <div className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div>
            <h1 className={`text-lg font-bold ${collapsed ? 'sr-only' : ''}`}>Sup Manager</h1>
            {!collapsed && <p className="text-xs text-neutral-500 dark:text-neutral-400">Gestione prenotazioni e contabilità</p>}
          </div>

          {/* Close button visible only on mobile */}
          <div className="lg:hidden">
            <button onClick={() => setMobileOpen(false)} aria-label="Chiudi menu" className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button onClick={() => setCollapsed((s) => !s)} aria-label="Riduci sidebar" className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-auto transition-all duration-200" aria-label="Main navigation">
          {items.map((it) => {
            const active = currentPage === it.id
            return (
              <button
                key={it.id}
                onClick={() => { onNav?.(it.id); setMobileOpen(false) }}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-3'} py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300 ${active ? 'bg-amber-500 text-white shadow' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                <span className="flex-shrink-0 text-current" aria-hidden><Icon name={it.id} /></span>
                <span title={it.label} className={`${collapsed ? 'hidden' : 'block truncate'}`}>{it.label}</span>
              </button>
            )
          })}
        </nav>

        <div className={`mt-auto ${collapsed ? 'text-center' : ''}`}>
          <button onClick={() => toggle()} className={`px-3 py-2 bg-sky-600 text-white rounded ${collapsed ? 'w-10 mx-auto' : 'w-full'}`}>
            {collapsed ? (theme === 'light' ? 'C' : 'S') : `Tema: ${theme === 'light' ? 'Chiaro' : 'Scuro'}`}
          </button>
        </div>
      </aside>
    </>
  )
}
