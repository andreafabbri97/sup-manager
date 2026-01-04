import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Bookings() {
  const [sups, setSups] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [supId, setSupId] = useState<string | null>(null)
  const [packageId, setPackageId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [bookings, setBookings] = useState<any[]>([])

  async function load() {
    const { data: s } = await supabase.from('sup').select('*')
    const { data: p } = await supabase.from('package').select('*')
    const { data: b } = await supabase.from('booking').select('*').order('created_at', { ascending: false })
    setSups(s || [])
    setPackages(p || [])
    setBookings(b || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function create() {
    if (!supId || !startTime) return alert('Seleziona SUP e data/ora')
    const end = new Date(startTime)
    end.setHours(end.getHours() + 1)
    const { error } = await supabase.from('booking').insert({ sup_id: supId, package_id: packageId, customer_name: customerName, start_time: startTime, end_time: end.toISOString() })
    if (error) return alert(error.message)
    setCustomerName('')
    setStartTime('')
    setSupId(null)
    setPackageId(null)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questa prenotazione?')) return
    const { error } = await supabase.from('booking').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <section className="mt-6 bg-white rounded-lg shadow p-6">
      <h3 className="font-medium">Prenotazioni</h3>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select value={supId || ''} onChange={(e) => setSupId(e.target.value || null)} className="border px-3 py-2 rounded">
          <option value="">Seleziona SUP</option>
          {sups.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select value={packageId || ''} onChange={(e) => setPackageId(e.target.value || null)} className="border px-3 py-2 rounded">
          <option value="">Seziona pacchetto (opzionale)</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input value={startTime} onChange={(e) => setStartTime(e.target.value)} type="datetime-local" className="border px-3 py-2 rounded" />
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome cliente" className="border px-3 py-2 rounded" />
      </div>
      <div className="mt-3">
        <button onClick={create} className="bg-sky-600 text-white rounded px-3 py-2">Crea prenotazione</button>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {bookings.map((b) => (
          <li key={b.id} className="flex items-center justify-between border p-2 rounded">
            <div>
              <div className="font-medium">{b.customer_name || 'Cliente sconosciuto'}</div>
              <div className="text-xs text-slate-500">{new Date(b.start_time).toLocaleString()}</div>
            </div>
            <div>
              <button onClick={() => remove(b.id)} className="text-red-600 text-sm">Elimina</button>
            </div>
          </li>
        ))}
        {bookings.length === 0 && <li className="text-slate-500">Nessuna prenotazione</li>}
      </ul>
    </section>
  )
}
