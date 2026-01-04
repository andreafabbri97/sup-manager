import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './components/Auth'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    load()
    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => {
      // @ts-ignore
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800">
      <header className="max-w-4xl mx-auto p-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sup Manager</h1>
        <nav className="space-x-3">
          <button className="px-3 py-1 rounded-md bg-white shadow">Dashboard</button>
          <button className="px-3 py-1 rounded-md">Bookings</button>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {!session ? <Auth /> : <Dashboard />}
      </main>
    </div>
  )
}
