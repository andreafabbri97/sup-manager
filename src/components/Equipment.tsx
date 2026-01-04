import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type EquipmentItem = { id: string; name: string; type: string; quantity: number; status?: string; notes?: string }

export default function Equipment() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('SUP')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems(){
    const { data, error } = await supabase.from('equipment').select('*').order('created_at', { ascending: false })
    if (error) console.error(error)
    else setItems(data || [])
  }

  async function createItem(e: React.FormEvent){
    e.preventDefault()
    const { data, error } = await supabase.from('equipment').insert([{ name, type, quantity }])
    if (error) { console.error(error); return }
    setName(''); setQuantity(1); setType('SUP')
    fetchItems()
  }

  async function deleteItem(id: string){
    await supabase.from('equipment').delete().eq('id', id)
    fetchItems()
  }

  return (
    <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-medium mb-3">Attrezzatura</h3>

      <form onSubmit={createItem} className="flex gap-2 mb-4">
        <input className="border px-2 py-1 rounded flex-1 dark:bg-slate-700" placeholder="Nome" value={name} onChange={(e)=>setName(e.target.value)} required />
        <select className="border px-2 py-1 rounded" value={type} onChange={(e)=>setType(e.target.value)}>
          <option>SUP</option>
          <option>Barca</option>
          <option>Remo</option>
          <option>Salvagente</option>
          <option>Altro</option>
        </select>
        <input type="number" min={1} className="w-20 border px-2 py-1 rounded" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
        <button className="bg-sky-600 text-white px-3 py-1 rounded">Aggiungi</button>
      </form>

      <div>
        {items.length === 0 && <p className="text-sm text-slate-500">Nessun elemento</p>}
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.id} className="flex items-center justify-between border rounded p-2 dark:border-slate-700">
              <div>
                <div className="font-medium">{it.name} <span className="text-xs text-slate-400">({it.type})</span></div>
                <div className="text-sm text-slate-500">Quantità: {it.quantity}</div>
              </div>
              <div className="flex gap-2">
                <button className="text-red-600" onClick={()=>deleteItem(it.id)}>Elimina</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
