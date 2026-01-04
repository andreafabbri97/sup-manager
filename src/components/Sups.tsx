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
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questo SUP?')) return
    const { error } = await supabase.from('sup').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <section className="mt-6 bg-white rounded-lg shadow p-6">
      <h3 className="font-medium">SUP</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome SUP" className="border px-3 py-2 rounded" />
        <button onClick={create} className="bg-sky-600 text-white rounded px-3 py-2" disabled={loading}>
          Aggiungi
        </button>
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
