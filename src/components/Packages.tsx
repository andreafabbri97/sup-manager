import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './ui/Modal'
import Button from './ui/Button'

export default function Packages() {
  const [packages, setPackages] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('60') // minuti
  const [selectedEquipment, setSelectedEquipment] = useState<{id: string, quantity: number}[]>([])

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

    const { error } = await supabase.from('package').insert(packageData)
    if (error) return alert(error.message)
    
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
          <h3 className="font-medium text-lg">I tuoi pacchetti</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Crea pacchetti preimpostati per velocizzare le prenotazioni</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Nuovo Pacchetto</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((p) => (
          <div key={p.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-lg">{p.name}</div>
              <button onClick={() => remove(p.id)} className="text-red-500 hover:text-red-600 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="text-2xl font-bold text-amber-500 mb-2">€ {Number(p.price).toFixed(2)}</div>
            {p.duration && <div className="text-sm text-neutral-500 dark:text-neutral-400">Durata: {p.duration} min</div>}
            {p.equipment_items && Array.isArray(p.equipment_items) && p.equipment_items.length > 0 && (
              <div className="mt-3 text-sm">
                <div className="font-medium text-neutral-600 dark:text-neutral-300 mb-1">Include:</div>
                <ul className="space-y-1">
                  {p.equipment_items.slice(0,3).map((item: any, idx: number) => {
                    const eq = equipment.find(e => e.id === item.id)
                    return <li key={idx} className="text-neutral-500 dark:text-neutral-400">• {item.quantity}x {eq?.name || 'Attrezzatura'}</li>
                  })}
                  {p.equipment_items.length > 3 && <li className="text-neutral-400">… e {p.equipment_items.length - 3} altri</li>}
                </ul>
              </div>
            )}
          </div>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500 dark:text-neutral-400">
            Nessun pacchetto creato. Clicca su "Nuovo Pacchetto" per iniziare.
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={handleClosePackageModal} title="Nuovo Pacchetto">
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
                        className={`w-6 h-6 rounded ${ (selected?.quantity || 0) <= 0 ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{selected?.quantity || 0}</span>
                      <button
                        onClick={() => handleEquipmentChange(eq.id, (selected?.quantity || 0) + 1)}
                        disabled={(selected?.quantity || 0) >= (eq.quantity ?? 1)}
                        aria-disabled={(selected?.quantity || 0) >= (eq.quantity ?? 1)}
                        className={`w-6 h-6 rounded ${ (selected?.quantity || 0) >= (eq.quantity ?? 1) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
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
            <Button onClick={create} className="flex-1">Crea Pacchetto</Button>
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
