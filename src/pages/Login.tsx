import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import { login, logout, getCurrentUserId } from '../lib/auth'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{id:string; username?:string; role?:string} | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => { refreshUser() }, [])

  async function refreshUser() {
    const id = await getCurrentUserId()
    if (!id) { setUser(null); return }
    const { data } = await supabase.from('app_user').select('id, username, role').eq('id', id).single()
    setUser(data ?? null)
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(username, password)
      setMessage('Accesso eseguito')
      await refreshUser()
      window.dispatchEvent(new CustomEvent('auth:changed'))
      window.dispatchEvent(new CustomEvent('navigate:booking'))
    } catch (e: any) {
      setMessage(e.message || 'Errore login')
    }
    setLoading(false)
  }

  async function signOut() {
    await logout()
    setUser(null)
    setMessage('Logout eseguito')
    window.dispatchEvent(new CustomEvent('auth:changed'))
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageTitle className="m-0">Login</PageTitle>
        {user && <Button variant="ghost" onClick={signOut}>Logout</Button>}
      </div>

      {message && <div className="text-sm text-emerald-600 dark:text-emerald-300">{message}</div>}

      <Card className="p-4 sm:p-6 space-y-3">
        <div className="text-sm text-neutral-600 dark:text-neutral-300">Usa username e password creati dagli admin per accedere. Gli admin possono gestire gli utenti dalla pagina "Utenti".</div>
        <form onSubmit={signIn} className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Username</label>
            <input className="w-full border rounded px-3 py-2" value={username} onChange={(e)=>setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Password</label>
            <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button type="submit" disabled={loading}>{loading ? 'Attendere...' : 'Accedi'}</Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="font-semibold mb-2">Sessione attuale</div>
        {user ? (
          <div className="text-sm space-y-1">
            <div>ID: {user.id}</div>
            <div>Username: {user.username || '—'}</div>
            <div>Role: {user.role || '—'}</div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Non sei autenticato.</div>
        )}
      </Card>
    </div>
  )
}
