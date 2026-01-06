import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import { supabase } from '../lib/supabaseClient'
import { clearCachedRole } from '../lib/auth'

interface AuthUserInfo {
  id: string
  email?: string | null
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<AuthUserInfo | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    refreshUser()
  }, [])

  async function refreshUser() {
    const { data } = await supabase.auth.getUser()
    const u = (data as any)?.user
    setUser(u ? { id: u.id, email: u.email } : null)
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Accesso eseguito')
    clearCachedRole()
    await refreshUser()
    window.dispatchEvent(new CustomEvent('auth:changed'))
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Registrazione completata, controlla la mail per la conferma')
  }

  async function signOut() {
    await supabase.auth.signOut()
    clearCachedRole()
    setUser(null)
    window.dispatchEvent(new CustomEvent('auth:changed'))
    setMessage('Logout eseguito')
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageTitle className="m-0">Login</PageTitle>
        {user && <Button variant="ghost" onClick={signOut}>Logout</Button>}
      </div>

      {message && <div className="text-sm text-emerald-600 dark:text-emerald-300">{message}</div>}

      <Card className="p-4 sm:p-6 space-y-3">
        <div className="text-sm text-neutral-600 dark:text-neutral-300">Autenticati con email e password Supabase.</div>
        <form onSubmit={signIn} className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Email</label>
            <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Password</label>
            <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button type="submit" disabled={loading}>{loading ? 'Attendere...' : 'Login'}</Button>
            <Button type="button" variant="secondary" disabled={loading} onClick={signUp}>Registrati</Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="font-semibold mb-2">Sessione attuale</div>
        {user ? (
          <div className="text-sm space-y-1">
            <div>ID: {user.id}</div>
            <div>Email: {user.email || '—'}</div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Non sei autenticato.</div>
        )}
      </Card>
    </div>
  )
}
