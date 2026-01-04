import React, { useCallback, useState } from 'react'
import Sidebar from './components/Sidebar'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  const [page, setPage] = useState('reports')
  const handleNav = useCallback((p: string) => setPage(p), [])

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex">
      <Sidebar onNav={handleNav} currentPage={page} />
      <main className="flex-1 p-4 w-full sm:max-w-6xl sm:mx-auto">
        {page === 'reports' ? <Reports /> : page === 'settings' ? <Settings /> : <Reports />}
      </main>
    </div>
  )
}