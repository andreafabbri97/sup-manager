import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Card from './ui/Card'
import PageTitle from './ui/PageTitle'
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
  const [editLastMaintenance, setEditLastMaintenance] = useState('')
  const [editNextMaintenance, setEditNextMaintenance] = useState('')
  const [editMaintenanceNotes, setEditMaintenanceNotes] = useState('')

  useEffect(() => { fetchItems()
    const timer: { id:any } = { id: 0 }
    const onEquip = () => { if (timer.id) clearTimeout(timer.id); timer.id = window.setTimeout(() => fetchItems(), 300) }
    const onSups = () => { if (timer.id) clearTimeout(timer.id); timer.id = window.setTimeout(() => fetchItems(), 300) }
    window.addEventListener('realtime:equipment', onEquip as any)
    window.addEventListener('realtime:sup', onSups as any)
    window.addEventListener('sups:changed', onSups as any)
    return () => { window.removeEventListener('realtime:equipment', onEquip as any); window.removeEventListener('realtime:sup', onSups as any); window.removeEventListener('sups:changed', onSups as any) }
  }, [])

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
    // translate status for display where necessary (keeps underlying value unchanged)
    setEditNotes(it.notes || '')
    setEditLastMaintenance((it as any).last_maintenance ? new Date((it as any).last_maintenance).toISOString().slice(0,10) : '')
    setEditNextMaintenance((it as any).next_maintenance ? new Date((it as any).next_maintenance).toISOString().slice(0,10) : '')
    setEditMaintenanceNotes((it as any).maintenance_notes || '')
    // open the modal-based editor
    setIsEditOpen(true)
  }

  async function saveEdit(){
    if (!editingId) return
    const p = parseFloat(editPricePerHour) || 0
    const updateData: any = { 
      name: editName.trim(), 
      type: editType, 
      quantity: editQuantity, 
      price_per_hour: p, 
      status: editStatus, 
      notes: editNotes,
      last_maintenance: editLastMaintenance || null,
      next_maintenance: editNextMaintenance || null,
      maintenance_notes: editMaintenanceNotes || null
    }
    const { error } = await supabase.from('equipment').update(updateData).eq('id', editingId)
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
  const [isEditOpen, setIsEditOpen] = useState(false)

  // move creation form into modal; open edit in modal (instead of inline)
  const openAdd = useCallback(() => { setIsAddOpen(true) }, [])
  const closeAdd = useCallback(() => { setIsAddOpen(false); setName(''); setQuantity(1); setType('SUP'); setPricePerHour('') }, [])
  const openEdit = useCallback(() => setIsEditOpen(true), [])
  const closeEdit = useCallback(() => { setIsEditOpen(false); setEditingId(null) }, [])

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <PageTitle className="m-0">Attrezzatura</PageTitle>
        <div className="flex gap-2">
          <Button onClick={openAdd}>Aggiungi attrezzatura</Button>
        </div>
      </div>
      <div>

        {items.length === 0 && <p className="text-sm text-neutral-500">Nessun elemento</p>}

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map(it => (
            <Card key={it.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow p-2 bg-white dark:bg-slate-700">
                <>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-lg truncate">{it.name}</div>
                    </div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">{it.type} • Quantità: {it.quantity}</div>
                    {((it as any).next_maintenance || (it as any).last_maintenance) && (
                      <div className="mt-2 text-xs border-t pt-2">
                        {(it as any).last_maintenance && (
                          <div className="text-neutral-500">Ultima manutenzione: {new Date((it as any).last_maintenance).toLocaleDateString('it-IT')}</div>
                        )}
                        {(it as any).next_maintenance && (
                          <div className={`font-medium ${new Date((it as any).next_maintenance) < new Date() ? 'text-red-600' : 'text-blue-600'}`}>
                            Prossima: {new Date((it as any).next_maintenance).toLocaleDateString('it-IT')}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`mt-3 inline-block px-2 py-1 text-xs rounded ${it.status === 'available' ? 'bg-green-100 text-green-800' : it.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{it.status === 'available' ? 'Disponibile' : it.status === 'maintenance' ? 'In manutenzione' : 'Ritirata'}</div>
                  </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-amber-500 font-semibold">{(it as any).price_per_hour ? `€ ${Number((it as any).price_per_hour).toFixed(2)} /h` : '—'}</div>
                      <div>
                        <div className="hidden sm:flex gap-2">
                          <Button onClick={()=>startEdit(it)} className="px-3 py-1">Modifica</Button>
                          <button onClick={()=>deleteItem(it.id)} className="px-3 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900">Elimina</button>
                        </div>
                        <div className="flex sm:hidden gap-2">
                          <button onClick={()=>startEdit(it)} className="p-2 rounded border" aria-label={`Modifica ${it.name}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 13.5V17h3.5L17.868 6.633 14.366 3.131 4 13.5z"/></svg>
                          </button>
                          <button onClick={()=>deleteItem(it.id)} className="p-2 rounded border text-red-500" aria-label={`Elimina ${it.name}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5-4h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                </>
            </Card>
          ))}
        </div>
      </div>

      <Modal isOpen={isAddOpen} onClose={closeAdd} title="Aggiungi attrezzatura" fullScreenMobile openFullMobile>
        <form onSubmit={(e)=>{ createItem(e); closeAdd() }} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input className="border px-2 py-1 rounded flex-1 min-w-0 dark:bg-neutral-800" placeholder="Nome" value={name} onChange={(e)=>setName(e.target.value)} required />
          <Listbox className="flex-1 min-w-0" options={[{value:'SUP',label:'SUP'},{value:'Barca',label:'Barca'},{value:'Remo',label:'Remo'},{value:'Salvagente',label:'Salvagente'},{value:'Altro',label:'Altro'}]} value={type} onChange={(v)=>setType(v ?? 'SUP')} />
          <input type="number" min={1} className="w-20 border px-2 py-1 rounded" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
          <input type="number" step="0.01" className="w-36 border px-2 py-1 rounded" placeholder="Prezzo / ora (€)" value={pricePerHour} onChange={(e)=>setPricePerHour(e.target.value)} />
          <Button> Aggiungi </Button>
        </form>
      </Modal>

      {/* Edit modal: move the inline edit into a modal for better UX */}
      <Modal isOpen={isEditOpen} onClose={closeEdit} title={editingId ? 'Modifica Attrezzatura' : 'Modifica Attrezzatura'} fullScreenMobile openFullMobile>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input className="w-full border px-2 py-1 rounded dark:bg-neutral-800" value={editName} onChange={(e)=>setEditName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <Listbox className="w-full" options={[{value:'SUP',label:'SUP'},{value:'Barca',label:'Barca'},{value:'Remo',label:'Remo'},{value:'Salvagente',label:'Salvagente'},{value:'Altro',label:'Altro'}]} value={editType} onChange={(v)=>setEditType(v ?? 'SUP')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantità</label>
              <input type="number" min={1} className="w-full border px-2 py-1 rounded" value={editQuantity} onChange={(e)=>setEditQuantity(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prezzo / ora (€)</label>
              <input type="number" step="0.01" className="w-full border px-2 py-1 rounded" value={editPricePerHour} onChange={(e)=>setEditPricePerHour(e.target.value)} />
            </div>
          </div>

          <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
            <Listbox options={[{value:'available',label:'Disponibile'},{value:'maintenance',label:'In manutenzione'},{value:'retired',label:'Ritirata'}]} value={editStatus} onChange={(v)=>setEditStatus(v ?? 'available')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea className="w-full border px-2 py-1 rounded" rows={3} placeholder="Note" value={editNotes} onChange={(e)=>setEditNotes(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ultima manutenzione</label>
              <input type="date" className="w-full border px-2 py-1 rounded dark:bg-neutral-800" value={editLastMaintenance} onChange={(e)=>setEditLastMaintenance(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prossima manutenzione</label>
              <input type="date" className="w-full border px-2 py-1 rounded dark:bg-neutral-800" value={editNextMaintenance} onChange={(e)=>setEditNextMaintenance(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note manutenzione</label>
            <textarea className="w-full border px-2 py-1 rounded" rows={3} placeholder="Dettagli manutenzione..." value={editMaintenanceNotes} onChange={(e)=>setEditMaintenanceNotes(e.target.value)} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Button onClick={() => { saveEdit(); closeEdit(); }} className="bg-green-600 w-full sm:w-auto">Salva</Button>
            <button onClick={() => { closeEdit(); }} type="button" className="px-3 py-1 rounded border w-full sm:w-auto">Annulla</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
