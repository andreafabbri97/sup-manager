import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDatePretty } from '../lib/format'

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')

  async function load() {
    const { data } = await supabase.from('expense').select('*').order('date', { ascending: false })
    setExpenses(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function create() {
    const a = parseFloat(amount) || 0
    const { error } = await supabase.from('expense').insert({ amount: a, category, notes, date: new Date().toISOString().slice(0,10) })
    if (error) return alert(error.message)
    setAmount('')
    setCategory('')
    setNotes('')
    load()
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questa spesa?')) return
    const { error } = await supabase.from('expense').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <section className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h3 className="font-medium">Spese</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Importo" className="border px-3 py-2 rounded" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria" className="border px-3 py-2 rounded" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note" className="border px-3 py-2 rounded" />
          <button onClick={create} className="bg-sky-600 text-white rounded px-3 py-2">Aggiungi</button>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {expenses.map((e) => (
          <li key={e.id} className="flex items-center justify-between border p-2 rounded">
            <div>
              <div className="font-medium">{e.category || 'Senza categoria'}</div>
              <div className="text-xs text-slate-500">€ {e.amount} • {formatDatePretty(e.date)}</div>
            </div>
            <div>
              <button onClick={() => remove(e.id)} className="text-red-600 text-sm">Elimina</button>
            </div>
          </li>
        ))}
        {expenses.length === 0 && <li className="text-slate-500">Nessuna spesa</li>}
      </ul>
    </section>
  )
}
