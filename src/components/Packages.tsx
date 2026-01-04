import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Packages() {
  const [packages, setPackages] = useState<any[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  async function load() {
    const { data } = await supabase.from('package').select('*').order('created_at', { ascending: false })
    setPackages(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function create() {
    if (!name.trim()) return
    const p = parseFloat(price) || 0
    const { error } = await supabase.from('package').insert({ name: name.trim(), price: p })
    if (error) return alert(error.message)
    setName('')
    setPrice('')
    load()
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questo pacchetto?')) return
    const { error } = await supabase.from('package').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <section className="mt-6 bg-white rounded-lg shadow p-6">
      <h3 className="font-medium">Pacchetti</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome pacchetto" className="border px-3 py-2 rounded" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prezzo" className="border px-3 py-2 rounded" />
        <div />
        <button onClick={create} className="bg-sky-600 text-white rounded px-3 py-2">
          Aggiungi
        </button>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {packages.map((p) => (
          <li key={p.id} className="flex items-center justify-between border p-2 rounded">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">€ {p.price}</div>
            </div>
            <div>
              <button onClick={() => remove(p.id)} className="text-red-600 text-sm">
                Elimina
              </button>
            </div>
          </li>
        ))}
        {packages.length === 0 && <li className="text-slate-500">Nessun pacchetto</li>}
      </ul>
    </section>
  )
}
