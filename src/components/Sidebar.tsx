import React from 'react'
import { useTheme } from '../lib/theme'

export default function Sidebar({ onNav, currentPage }: { onNav?: (page: string) => void; currentPage?: string }) {
  const { theme, toggle } = useTheme()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'equipment', label: 'Attrezzatura' },
    { id: 'bookings', label: 'Prenotazioni' },
    { id: 'packages', label: 'Pacchetti' },
    { id: 'expenses', label: 'Spese' },
    { id: 'reports', label: 'Amministrazione e Report' }
  ]

  const Icon = ({ name }: { name: string }) => {
    switch (name) {
      case 'dashboard':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zM14 3h7v7h-7V3zM14 14h7v7h-7v-7zM3 14h7v7H3v-7z" />
          </svg>
        )
      case 'equipment':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M4 7h16" />
          </svg>
        )
      case 'bookings':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M8 3v4M16 3v4M21 10v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
          </svg>
        )
      case 'packages':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73L13 3l-7 3.27A2 2 0 0 0 5 8v8a2 2 0 0 0 1 1.73L11 21l7-3.27A2 2 0 0 0 21 16z" />
          </svg>
        )
      case 'expenses':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.105 0-2 .672-2 1.5S10.895 11 12 11s2-.672 2-1.5S13.105 8 12 8zm0 4c-1.105 0-2 .672-2 1.5S10.895 15 12 15s2-.672 2-1.5S13.105 12 12 12z" />
          </svg>
        )
      case 'reports':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-2 bg-white dark:bg-neutral-900 border-b dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen((s) => !s)} aria-label="Apri menu" className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-semibold">Sup Manager</div>
        </div>
        <div>
          <button onClick={() => toggle()} className="px-3 py-1 rounded bg-sky-600 text-white">{theme === 'light' ? 'Chiaro' : 'Scuro'}</button>
        </div>
      </div>

      <aside className={`min-h-screen bg-neutral-50 dark:bg-neutral-900 border-r dark:border-neutral-800 p-4 transition-all duration-150 ${collapsed ? 'w-16' : 'w-64'} ${mobileOpen ? 'fixed z-40 left-0 top-0 h-full' : 'md:static'}`}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className={`text-lg font-bold ${collapsed ? 'sr-only' : ''}`}>Sup Manager</h1>
            {!collapsed && <p className="text-xs text-neutral-500 dark:text-neutral-400">Gestione prenotazioni e contabilità</p>}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setCollapsed((s) => !s)} aria-label="Riduci sidebar" className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="space-y-1" aria-label="Main navigation">
          {items.map((it) => {
            const active = currentPage === it.id
            return (
              <button
                key={it.id}
                onClick={() => { onNav?.(it.id); setMobileOpen(false) }}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${active ? 'bg-brand-500 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                <span className="flex-shrink-0 text-current"><Icon name={it.id} /></span>
                <span className={`${collapsed ? 'hidden' : 'block'}`}>{it.label}</span>
              </button>
            )
          })}
        </nav>

        <div className={`mt-6 ${collapsed ? 'text-center' : ''}`}>
          <button onClick={() => toggle()} className="px-3 py-2 bg-sky-600 text-white rounded w-full">
            {collapsed ? (theme === 'light' ? 'C' : 'S') : `Tema: ${theme === 'light' ? 'Chiaro' : 'Scuro'}`}
          </button>
        </div>
      </aside>
    </>
  )
}
