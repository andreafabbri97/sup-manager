import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Card from './ui/Card'
import Button from './ui/Button'

export default function Bookings() {
  const [sups, setSups] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [supId, setSupId] = useState<string | null>(null)
  const [packageId, setPackageId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [bookings, setBookings] = useState<any[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editCustomer, setEditCustomer] = useState('')
  const [editPackage, setEditPackage] = useState<string | null>(null)

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

  function computeEnd(start: string, pkgId?: string | null) {
    const d = pkgId ? packages.find((p) => p.id === pkgId)?.duration_minutes : undefined
    const end = new Date(start)
    if (d) end.setMinutes(end.getMinutes() + Number(d))
    else end.setHours(end.getHours() + 1)
    return end.toISOString()
  }

  async function create() {
    if (!supId || !startTime) return alert('Seleziona SUP e data/ora')
    const end_time = computeEnd(startTime, packageId)
    const price = packageId ? packages.find((p) => p.id === packageId)?.price ?? null : null
    const { error } = await supabase.from('booking').insert({ sup_id: supId, package_id: packageId, customer_name: customerName, start_time: startTime, end_time, price })
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

  function startEdit(b: any){
    setEditingId(b.id)
    setEditStart(b.start_time.slice(0,16))
    setEditCustomer(b.customer_name || '')
    setEditPackage(b.package_id || null)
  }

  async function saveEdit(){
    if (!editingId) return
    const end_time = computeEnd(editStart, editPackage)
    const { error } = await supabase.from('booking').update({ start_time: editStart, end_time, customer_name: editCustomer, package_id: editPackage }).eq('id', editingId)
    if (error) return alert(error.message)
    setEditingId(null)
    load()
  }

  function cancelEdit(){ setEditingId(null) }

  return (
    <section className="mt-6">
      <Card>
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
              <option key={p.id} value={p.id}>{p.name} {p.price ? `- ${p.price}€` : ''}</option>
            ))}
          </select>
          <input value={startTime} onChange={(e) => setStartTime(e.target.value)} type="datetime-local" className="border px-3 py-2 rounded" />
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome cliente" className="border px-3 py-2 rounded" />
        </div>
        <div className="mt-3">
          <Button onClick={create}>Crea prenotazione</Button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {bookings.map((b) => (
            <Card key={b.id} className="flex items-center justify-between">
              {editingId === b.id ? (
                <div className="flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input value={editStart} onChange={(e) => setEditStart(e.target.value)} type="datetime-local" className="border px-2 py-1 rounded" />
                    <select value={editPackage || ''} onChange={(e)=>setEditPackage(e.target.value || null)} className="border px-2 py-1 rounded">
                      <option value="">Nessun pacchetto</option>
                      {packages.map((p)=> <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input value={editCustomer} onChange={(e)=>setEditCustomer(e.target.value)} className="border px-2 py-1 rounded" />
                  </div>

                  <div className="mt-2 flex gap-2 justify-end">
                    <Button onClick={saveEdit} className="bg-green-600">Salva</Button>
                    <button onClick={cancelEdit} className="px-3 py-1 border rounded">Annulla</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="font-medium">{b.customer_name || 'Cliente sconosciuto'}</div>
                    <div className="text-xs text-neutral-500">{new Date(b.start_time).toLocaleString()}</div>
                    {b.price && <div className="text-xs text-neutral-500">Prezzo: {Number(b.price).toFixed(2)} €</div>}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={()=>startEdit(b)} className="px-3 py-1 border rounded">Modifica</button>
                    <button onClick={() => remove(b.id)} className="px-3 py-1 rounded text-red-600">Elimina</button>
                  </div>
                </>
              )}
            </Card>
          ))}
          {bookings.length === 0 && <div className="text-neutral-500">Nessuna prenotazione</div>}
        </div>
      </Card>
    </section>
  )
}
