import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function syntheticEmailFor(username: string) {
    // Use a safe placeholder domain to avoid invalid-email rejections by Supabase
    // Using example.com is a common placeholder domain
    return `${username}@example.com`
  }

  function showError(err: any) {
    console.error(err)
    if (err?.message) return err.message
    if (typeof err === 'string') return err
    return 'Errore nella richiesta (vedi console per dettagli)'
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (username.length < 3) {
      setMessage('Username troppo corto (min 3 caratteri).')
      setLoading(false)
      return
    }

    // Check username availability
    const { data: existing } = await supabase.from('user').select('id').ilike('username', username).limit(1)
    if (existing && existing.length) {
      setMessage('Username già in uso.')
      setLoading(false)
      return
    }

    const email = syntheticEmailFor(username)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        if (error.message && error.message.includes('User already registered')) {
          setMessage('Username già in uso.')
          setLoading(false)
          return
        }
        setMessage(showError(error))
        setLoading(false)
        return
      }

      // If signUp succeeded, upsert profile row (role left as default 'staff')
      const user = data.user
      if (user) {
        await supabase.from('user').upsert({ id: user.id, email: user.email, username })
        setMessage('Registrazione completata. Effettua il login.')
      } else {
        setMessage('Registrazione: utente creato, controlla Supabase.')
      }
    } catch (err) {
      setMessage(showError(err))
      setLoading(false)
      return
    }

    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const email = syntheticEmailFor(username)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) setMessage(showError(error))
      else setMessage('Login effettuato.')
    } catch (err) {
      setLoading(false)
      setMessage(showError(err))
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">{mode === 'login' ? 'Login' : 'Registrazione'}</h2>
        <button
          className="text-sm text-sky-600"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Crea account' : 'Ho già un account'}
        </button>
      </div>

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
        <input
          className="w-full border px-3 py-2 rounded"
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="w-full border px-3 py-2 rounded"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          className="w-full bg-sky-600 text-white py-2 rounded disabled:opacity-60"
          disabled={loading}
        >
          {mode === 'login' ? 'Accedi' : 'Registrati'}
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}

      <p className="mt-4 text-xs text-slate-500">Nota: le email non sono usate; l'app usa username+password e crea un account con email sintetica interna.</p>
    </div>
  )
}
