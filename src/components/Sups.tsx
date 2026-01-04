import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Sups() {
  const [sups, setSups] = useState<any[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    const { data } = await supabase.from('sup').select('*').order('created_at', { ascending: false })
    setSups(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function create() {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('sup').insert({ name: name.trim() })
    setLoading(false)
    if (error) return alert(error.message)
    setName('')
    load()
    // notify other components that sup list changed (Bookings listens for this)
    window.dispatchEvent(new CustomEvent('sups:changed'))
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questo SUP?')) return
    const { error } = await supabase.from('sup').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <section className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h3 className="font-medium">SUP</h3>
        <div className="flex gap-2 items-center">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome SUP" className="border px-3 py-2 rounded" />
          <button onClick={create} className="bg-sky-600 text-white rounded px-3 py-2" disabled={loading}>
            Aggiungi
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {sups.map((s) => (
          <li key={s.id} className="flex items-center justify-between border p-2 rounded">
            <div>{s.name}</div>
            <div>
              <button onClick={() => remove(s.id)} className="text-red-600 text-sm">
                Elimina
              </button>
            </div>
          </li>
        ))}
        {sups.length === 0 && <li className="text-slate-500">Nessun SUP registrato</li>}
      </ul>
    </section>
  )
}
