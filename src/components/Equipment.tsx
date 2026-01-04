import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Card from './ui/Card'
import Button from './ui/Button'
import Listbox from './ui/Listbox'
import Modal from './ui/Modal'

type EquipmentItem = { id: string; name: string; type: string; quantity: number; status?: string; notes?: string }

export default function Equipment() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('SUP')
  const [quantity, setQuantity] = useState(1)
  const [pricePerHour, setPricePerHour] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [editQuantity, setEditQuantity] = useState(1)
  const [editPricePerHour, setEditPricePerHour] = useState('')
  const [editStatus, setEditStatus] = useState('available')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => { fetchItems() }, [])

  async function fetchItems(){
    const { data, error } = await supabase.from('equipment').select('*').order('created_at', { ascending: false })
    if (error) console.error(error)
    else setItems(data || [])
  }

  async function createItem(e: React.FormEvent){
    e.preventDefault()
    if (!name.trim()) return
    const p = parseFloat(pricePerHour) || 0
    const { data, error } = await supabase.from('equipment').insert([{ name: name.trim(), type, quantity, price_per_hour: p }])
    if (error) { console.error(error); return }
    const inserted = (data || [])[0] as any
    // if equipment is SUP type, create matching SUP records so they are bookable
    if (inserted && type === 'SUP' && Number(quantity) > 0){
      try {
        const supsToCreate = Array.from({length: Number(quantity)}, (_,i)=>({ name: `${inserted.name} #${i+1}`, equipment_id: (inserted as any).id }))
        const { error: supErr } = await supabase.from('sup').insert(supsToCreate)
        if (supErr) console.error('Error creating sup records:', supErr)
        else window.dispatchEvent(new CustomEvent('sups:changed'))
      } catch(err){ console.error(err) }
    }

    setName(''); setQuantity(1); setType('SUP')
    fetchItems()
  }

  async function deleteItem(id: string){
    if (!confirm('Sei sicuro di eliminare questo elemento?')) return
    // remove associated SUPs
    try {
      await supabase.from('sup').delete().eq('equipment_id', id)
      window.dispatchEvent(new CustomEvent('sups:changed'))
    } catch (err) { console.error(err) }

    const { error } = await supabase.from('equipment').delete().eq('id', id)
    if (error) console.error(error)
    fetchItems()
  }

  function startEdit(it: EquipmentItem){
    setEditingId(it.id)
    setEditName(it.name)
    setEditType(it.type)
    setEditQuantity(it.quantity)
    setEditPricePerHour((it as any).price_per_hour ? String((it as any).price_per_hour) : '')
    setEditStatus(it.status || 'available')
    setEditNotes(it.notes || '')
  }

  async function saveEdit(){
    if (!editingId) return
    const p = parseFloat(editPricePerHour) || 0
    const { error } = await supabase.from('equipment').update({ name: editName.trim(), type: editType, quantity: editQuantity, price_per_hour: p, status: editStatus, notes: editNotes }).eq('id', editingId)
    if (error) console.error(error)

    // sync SUP records if equipment is SUP
    try {
      const { data: currentSups } = await supabase.from('sup').select('id').eq('equipment_id', editingId)
      const currentCount = (currentSups || []).length
      if (editType === 'SUP'){
        if (currentCount < editQuantity){
          // create additional sups
          const add = Array.from({length: editQuantity - currentCount}, (_,i)=>({ name: `${editName} #${currentCount + i + 1}`, equipment_id: editingId }))
          await supabase.from('sup').insert(add)
          window.dispatchEvent(new CustomEvent('sups:changed'))
        } else if (currentCount > editQuantity){
          // remove excess sups (oldest)
          const { data: excess } = await supabase.from('sup').select('id').eq('equipment_id', editingId).order('created_at', { ascending: true }).limit(currentCount - editQuantity)
          const ids = (excess || []).map((r:any)=>r.id)
          if (ids.length) await supabase.from('sup').delete().in('id', ids)
          window.dispatchEvent(new CustomEvent('sups:changed'))
        }
      } else {
        // if type changed away from SUP, delete linked sups
        if (currentCount > 0){
          await supabase.from('sup').delete().eq('equipment_id', editingId)
          window.dispatchEvent(new CustomEvent('sups:changed'))
        }
      }
    } catch(err){ console.error(err) }

    setEditingId(null)
    fetchItems()
  }

  function cancelEdit(){
    setEditingId(null)
  }

  const [isAddOpen, setIsAddOpen] = useState(false)

  // move creation form into modal; keep edit inline in cards
  function openAdd(){ setIsAddOpen(true) }
  function closeAdd(){ setIsAddOpen(false); setName(''); setQuantity(1); setType('SUP'); setPricePerHour('') }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Attrezzatura</h3>
        <div className="flex gap-2">
          <Button onClick={openAdd}>Aggiungi attrezzatura</Button>
        </div>
      </div>
      <Card>

        {items.length === 0 && <p className="text-sm text-neutral-500">Nessun elemento</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(it => (
            <Card key={it.id} className="flex flex-col justify-between">
              {editingId === it.id ? (
                <div>
                  <div className="mb-2">
                    <input className="w-full border px-2 py-1 rounded mb-2 dark:bg-neutral-800" value={editName} onChange={(e)=>setEditName(e.target.value)} />
                    <Listbox options={[{value:'SUP',label:'SUP'},{value:'Barca',label:'Barca'},{value:'Remo',label:'Remo'},{value:'Salvagente',label:'Salvagente'},{value:'Altro',label:'Altro'}]} value={editType} onChange={(v)=>setEditType(v ?? 'SUP')} />
                    <input type="number" min={1} className="w-24 border px-2 py-1 rounded mb-2" value={editQuantity} onChange={(e)=>setEditQuantity(Number(e.target.value))} />
                    <input type="number" step="0.01" className="w-36 border px-2 py-1 rounded mb-2" placeholder="Prezzo / ora (€)" value={editPricePerHour} onChange={(e)=>setEditPricePerHour(e.target.value)} />
                    <Listbox options={[{value:'available',label:'available'},{value:'maintenance',label:'maintenance'},{value:'retired',label:'retired'}]} value={editStatus} onChange={(v)=>setEditStatus(v ?? 'available')} />
                    <textarea className="w-full border px-2 py-1 rounded" rows={3} value={editNotes} onChange={(e)=>setEditNotes(e.target.value)} />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button onClick={saveEdit} className="bg-green-600">Salva</Button>
                    <button onClick={cancelEdit} type="button" className="px-3 py-1 rounded border">Annulla</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="font-medium text-lg">{it.name}</div>
                    <div className="text-sm text-neutral-500">{it.type} • Quantità: {it.quantity}</div>
                    <div className="text-sm text-amber-500 font-semibold">Prezzo: € {(it as any).price_per_hour ? Number((it as any).price_per_hour).toFixed(2) : '0.00'} / ora</div>
                    {it.notes && <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{it.notes}</div>}
                    <div className={`mt-3 inline-block px-2 py-1 text-xs rounded ${it.status === 'available' ? 'bg-green-100 text-green-800' : it.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{it.status}</div>
                  </div>

                  <div className="mt-4 flex gap-2 justify-end">
                    <button onClick={()=>startEdit(it)} className="px-3 py-1 border rounded">Modifica</button>
                    <button onClick={()=>deleteItem(it.id)} className="px-3 py-1 rounded text-red-600">Elimina</button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </Card>

      <Modal isOpen={isAddOpen} onClose={closeAdd} title="Aggiungi attrezzatura">
        <form onSubmit={(e)=>{ createItem(e); closeAdd() }} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input className="border px-2 py-1 rounded flex-1 dark:bg-neutral-800" placeholder="Nome" value={name} onChange={(e)=>setName(e.target.value)} required />
          <Listbox options={[{value:'SUP',label:'SUP'},{value:'Barca',label:'Barca'},{value:'Remo',label:'Remo'},{value:'Salvagente',label:'Salvagente'},{value:'Altro',label:'Altro'}]} value={type} onChange={(v)=>setType(v ?? 'SUP')} />
          <input type="number" min={1} className="w-20 border px-2 py-1 rounded" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
          <input type="number" step="0.01" className="w-36 border px-2 py-1 rounded" placeholder="Prezzo / ora (€)" value={pricePerHour} onChange={(e)=>setPricePerHour(e.target.value)} />
          <Button> Aggiungi </Button>
        </form>
      </Modal>
    </div>
  )
}
