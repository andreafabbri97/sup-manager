import React, { useCallback, useState } from 'react'
import Dashboard from './pages/Dashboard'
import Sidebar from './components/Sidebar'
import Reports from './pages/Reports'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const handleNav = useCallback((p: string) => setPage(p), [])

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex">
      <Sidebar onNav={handleNav} currentPage={page} />
      <main className="flex-1 p-4">
        {page === 'reports' ? <Reports /> : <Dashboard page={page} />}
      </main>
    </div>
  )
}