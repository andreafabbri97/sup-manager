import React from 'react'
import { useTheme } from '../lib/theme'

export default function Sidebar({ onNav }: { onNav?: (page: string) => void }) {
  const { theme, toggle } = useTheme()

  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'equipment', label: 'Attrezzatura' },
    { id: 'bookings', label: 'Prenotazioni' },
    { id: 'packages', label: 'Pacchetti' },
    { id: 'expenses', label: 'Spese' }
  ]

  return (
    <aside className="w-64 min-h-screen bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4">
      <div className="mb-6">
        <h1 className="text-lg font-bold">Sup Manager</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Gestione prenotazioni e contabilità</p>
      </div>

      <nav className="space-y-1" aria-label="Main navigation">
        {items.map((it) => (
          <button
            key={it.id}
            className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => onNav?.(it.id)}
          >
            {it.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        <button
          className="px-3 py-2 bg-sky-600 text-white rounded"
          onClick={() => toggle()}
        >
          Tema: {theme === 'light' ? 'Chiaro' : 'Scuro'}
        </button>
      </div>
    </aside>
  )
}
