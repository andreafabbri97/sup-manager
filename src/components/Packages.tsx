import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './ui/Modal'
import Button from './ui/Button'
import PageTitle from './ui/PageTitle'

export default function Packages() {
  const [packages, setPackages] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('60') // minuti
  const [selectedEquipment, setSelectedEquipment] = useState<{id: string, quantity: number}[]>([])
  const [editPackage, setEditPackage] = useState<any | null>(null)

  async function load() {
    const { data } = await supabase.from('package').select('*').order('created_at', { ascending: false })
    setPackages(data || [])
  }

  async function loadEquipment() {
    const { data } = await supabase.from('equipment').select('*').order('name')
    setEquipment(data || [])
  }

  useEffect(() => {
    load()
    loadEquipment()
  }, [])

  async function create() {
    if (!name.trim()) return alert('Inserisci un nome per il pacchetto')
    const p = parseFloat(price) || 0
    const d = parseInt(duration) || 60

    // Salva pacchetto con metadata attrezzatura
    const packageData = {
      name: name.trim(),
      price: p,
      duration: d,
      equipment_items: selectedEquipment
    }

    if (editPackage) {
      const { error } = await supabase.from('package').update(packageData).eq('id', editPackage.id)
      if (error) return alert(error.message)
      setEditPackage(null)
    } else {
      const { error } = await supabase.from('package').insert(packageData)
      if (error) return alert(error.message)
    }

    resetForm()
    setShowModal(false)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questo pacchetto?')) return
    const { error } = await supabase.from('package').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  function resetForm() {
    setName('')
    setPrice('')
    setDuration('60')
    setSelectedEquipment([])
  }

  const handleClosePackageModal = useCallback(() => {
    setShowModal(false)
    resetForm()
    setEditPackage(null)
  }, [])

  function handleEquipmentChange(equipId: string, quantity: number) {
    if (quantity <= 0) {
      setSelectedEquipment(selectedEquipment.filter(e => e.id !== equipId))
    } else {
      const exists = selectedEquipment.find(e => e.id === equipId)
      if (exists) {
        setSelectedEquipment(selectedEquipment.map(e => e.id === equipId ? {...e, quantity} : e))
      } else {
        setSelectedEquipment([...selectedEquipment, {id: equipId, quantity}])
      }
    }
  }



  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <PageTitle className="m-0">I tuoi pacchetti</PageTitle>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 hidden sm:block">Crea pacchetti preimpostati per velocizzare le prenotazioni</p>
          <Button onClick={() => setShowModal(true)}>+ Nuovo Pacchetto</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((p) => (
          <div key={p.id} className="bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-3 sm:p-4 hover:shadow-lg transition-shadow interactive">
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-lg truncate sm:max-w-[60%]">{p.name}</div>
              <div className="flex items-center gap-2">
                <div className="text-xl sm:text-2xl font-bold text-amber-500 whitespace-nowrap">€ {Number(p.price).toFixed(2)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{p.duration ? `${p.duration} min` : ''}</div>
              <div className="flex items-center gap-2">
                {/* full text buttons on sm+ */}
                <button onClick={() => { setEditPackage(p); setName(p.name || ''); setPrice(String(p.price ?? '')); setDuration(String(p.duration ?? '60')); setSelectedEquipment((p.equipment_items || []).map((it:any)=>({id: it.id, quantity: it.quantity || 1}))); setShowModal(true) }} className="hidden sm:inline-flex text-sm px-2 py-1 rounded border">Modifica</button>
                <button onClick={() => remove(p.id)} className="hidden sm:inline-flex text-red-500 hover:text-red-600 text-sm px-2 py-1 rounded border">Elimina</button>
                {/* icon-only on mobile */}
                <button onClick={() => { setEditPackage(p); setName(p.name || ''); setPrice(String(p.price ?? '')); setDuration(String(p.duration ?? '60')); setSelectedEquipment((p.equipment_items || []).map((it:any)=>({id: it.id, quantity: it.quantity || 1}))); setShowModal(true) }} className="sm:hidden p-2 rounded border" aria-label={`Modifica ${p.name}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 13.5V17h3.5L17.868 6.633 14.366 3.131 4 13.5z"/></svg>
                </button>
                <button onClick={() => remove(p.id)} className="sm:hidden p-2 rounded border text-red-500" aria-label={`Elimina ${p.name}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5-4h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
                </button>
              </div>
            </div>

            {/* include list: hidden on small screens, show summary + toggle */}
            {p.equipment_items && Array.isArray(p.equipment_items) && p.equipment_items.length > 0 && (
              <>
                <div className="hidden sm:block mt-3 text-sm">
                  <div className="font-medium text-neutral-600 dark:text-neutral-300 mb-1">Include:</div>
                  <ul className="space-y-1">
                    {p.equipment_items.slice(0,3).map((item: any, idx: number) => {
                      const eq = equipment.find(e => e.id === item.id)
                      return <li key={idx} className="text-neutral-500 dark:text-neutral-400">• {item.quantity}x {eq?.name || 'Attrezzatura'}</li>
                    })}
                    {p.equipment_items.length > 3 && <li className="text-neutral-400">… e {p.equipment_items.length - 3} altri</li>}
                  </ul>
                </div>

                <div className="sm:hidden mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-neutral-500">
                      {p.equipment_items.slice(0,2).map((item:any, idx:number) => {
                        const eq = equipment.find(e => e.id === item.id)
                        return <span key={idx} className="inline-block bg-neutral-100 dark:bg-neutral-700 text-sm px-2 py-0.5 rounded mr-1">{item.quantity}x {eq?.name || 'Attrezzatura'}</span>
                      })}
                      {p.equipment_items.length > 2 && <span className="text-sm text-neutral-400 ml-1">+{p.equipment_items.length - 2}</span>}
                    </div>
                    {/* No expansion button by design */}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500 dark:text-neutral-400">
            Nessun pacchetto creato. Clicca su "Nuovo Pacchetto" per iniziare.
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={handleClosePackageModal} title={editPackage ? 'Modifica Pacchetto' : 'Nuovo Pacchetto'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome Pacchetto</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Escursione Famiglia"
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prezzo (€)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Durata (minuti)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Attrezzatura Inclusa</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-3">
              {equipment.map((eq) => {
                const selected = selectedEquipment.find(e => e.id === eq.id)
                return (
                  <div key={eq.id} className="flex items-center justify-between">
                    <span className="text-sm">{eq.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEquipmentChange(eq.id, (selected?.quantity || 0) - 1)}
                        disabled={(selected?.quantity || 0) <= 0}
                        aria-disabled={(selected?.quantity || 0) <= 0}
                        className={(selected?.quantity || 0) <= 0 ? 'w-8 h-8 rounded bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{selected?.quantity || 0}</span>
                      <button
                        onClick={() => handleEquipmentChange(eq.id, (selected?.quantity || 0) + 1)}
                        disabled={(selected?.quantity || 0) >= (eq.quantity ?? 1)}
                        aria-disabled={(selected?.quantity || 0) >= (eq.quantity ?? 1)}
                        className={(selected?.quantity || 0) >= (eq.quantity ?? 1) ? 'w-8 h-8 rounded bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
              {equipment.length === 0 && (
                <div className="text-sm text-neutral-500 text-center py-4">Nessuna attrezzatura disponibile</div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={create} className="flex-1">{editPackage ? 'Salva Modifiche' : 'Crea Pacchetto'}</Button>
            <button
              onClick={handleClosePackageModal}
              className="px-4 py-2 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
