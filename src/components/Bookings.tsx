import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from './ui/Button'
import Modal from './ui/Modal'

type ViewMode = 'day' | 'week' | 'month'

export default function Bookings() {
  const [equipment, setEquipment] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<{id: string, quantity: number}[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [startTime, setStartTime] = useState('')

  async function load() {
    const { data: eq } = await supabase.from('equipment').select('*').order('name')
    const { data: p } = await supabase.from('package').select('*')
    const { data: b } = await supabase.from('booking').select('*').order('start_time', { ascending: true })
    setEquipment(eq || [])
    setPackages(p || [])
    setBookings(b || [])
  }

  useEffect(() => {
    load()

    const handler = () => load()
    window.addEventListener('sups:changed', handler)
    return () => window.removeEventListener('sups:changed', handler)
  }, [])

  function resetForm() {
    setSelectedEquipment([])
    setSelectedPackage(null)
    setCustomerName('')
    setStartTime('')
  }

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

  async function createBooking() {
    if (!startTime) return alert('Seleziona data e ora')
    if (selectedEquipment.length === 0 && !selectedPackage) return alert('Seleziona almeno un\'attrezzatura o un pacchetto')

    let duration = 60 // default 1 hour
    let price = 0

    // Se c'è un pacchetto, usa i suoi parametri
    if (selectedPackage) {
      const pkg = packages.find(p => p.id === selectedPackage)
      if (pkg) {
        duration = pkg.duration || 60
        price = pkg.price || 0
      }
    }

    const end_time = new Date(startTime)
    end_time.setMinutes(end_time.getMinutes() + duration)

    const bookingData = {
      customer_name: customerName,
      start_time: startTime,
      end_time: end_time.toISOString(),
      price,
      package_id: selectedPackage,
      equipment_items: selectedEquipment
    }

    const { error } = await supabase.from('booking').insert(bookingData)
    if (error) {
      // Handle known Supabase/PostgREST schema cache issue with helpful guidance
      if (error.message && error.message.includes("Could not find")) {
        alert("Errore: la colonna 'equipment_items' non è riconosciuta dal server. Assicurati di aver eseguito le migrazioni su Supabase e poi ricarica la pagina (F5). Se l'errore persiste, riavvia il progetto Supabase dal pannello Settings → Database → Restart e riprova.")
      } else {
        alert(error.message)
      }
      return
    }
    
    resetForm()
    setShowModal(false)
    load()
  }

  async function removeBooking(id: string) {
    if (!confirm('Eliminare questa prenotazione?')) return
    const { error } = await supabase.from('booking').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  // Calendar utilities
  function getWeekDays(date: Date) {
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay() + 1) // Monday
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  function getMonthDays(date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    
    // Pad start
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    for (let i = startDay; i > 0; i--) {
      const d = new Date(firstDay)
      d.setDate(d.getDate() - i)
      days.push(d)
    }
    
    // Month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  function getBookingsForDate(date: Date) {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)
    
    return bookings.filter(b => {
      const bStart = new Date(b.start_time)
      return bStart >= dayStart && bStart <= dayEnd
    })
  }

  function navigateDate(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  function getDateRangeLabel() {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    } else if (viewMode === 'week') {
      const days = getWeekDays(currentDate)
      return `${days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-medium text-lg">Calendario Prenotazioni</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Gestisci le prenotazioni della tua attrezzatura</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Nuova Prenotazione</Button>
      </div>

      {/* View controls */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate('prev')} className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-sm font-medium min-w-[200px] text-center">{getDateRangeLabel()}</div>
          <button onClick={() => navigateDate('next')} className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="ml-2 px-3 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Oggi
          </button>
        </div>

        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded p-1">
          <button onClick={() => setViewMode('day')} className={`px-3 py-1 text-sm rounded ${viewMode === 'day' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Giorno</button>
          <button onClick={() => setViewMode('week')} className={`px-3 py-1 text-sm rounded ${viewMode === 'week' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Settimana</button>
          <button onClick={() => setViewMode('month')} className={`px-3 py-1 text-sm rounded ${viewMode === 'month' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Mese</button>
        </div>
      </div>

      {/* Calendar view */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
        {viewMode === 'day' && (
          <div className="p-4">
            <div className="space-y-2">
              {getBookingsForDate(currentDate).map(b => (
                <div key={b.id} className="p-3 rounded border border-neutral-200 dark:border-neutral-700 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{b.customer_name || 'Cliente'}</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} - {new Date(b.end_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}
                      </div>
                      {b.price && <div className="text-sm text-amber-600 dark:text-amber-400">€ {b.price}</div>}
                    </div>
                    <button onClick={() => removeBooking(b.id)} className="text-red-500 hover:text-red-600 p-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {getBookingsForDate(currentDate).length === 0 && (
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">Nessuna prenotazione per questa giornata</div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <>
            {/* Desktop / Tablet: grid */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="grid grid-cols-7 sm:min-w-[700px]">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, i) => (
                  <div key={i} className="p-2 text-center text-sm font-medium border-b border-neutral-200 dark:border-neutral-700">
                    {day}
                  </div>
                ))}
                {getWeekDays(currentDate).map((day, i) => {
                  const dayBookings = getBookingsForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} className={`p-2 border-r border-b border-neutral-200 dark:border-neutral-700 min-h-[150px] ${isToday ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                      <div className={`text-sm font-medium mb-2 ${isToday ? 'text-amber-600 dark:text-amber-400' : ''}`}>{day.getDate()}</div>
                      <div className="space-y-1">
                        {dayBookings.map(b => (
                          <div key={b.id} className="text-xs p-1 rounded bg-amber-100 dark:bg-amber-900/30 truncate cursor-pointer" onClick={() => removeBooking(b.id)}>
                            <div className="font-medium truncate">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</div>
                            <div className="truncate">{b.customer_name || 'Cliente'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile: stacked days */}
            <div className="sm:hidden p-2">
              {getWeekDays(currentDate).map((day) => {
                const dayBookings = getBookingsForDate(day)
                const isToday = day.toDateString() === new Date().toDateString()
                return (
                  <div key={day.toDateString()} className={`mb-3 p-3 rounded border ${isToday ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200' : 'border-neutral-200 dark:border-neutral-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{day.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                      <div className="text-sm text-neutral-500">{dayBookings.length} prenotazioni</div>
                    </div>
                    <div className="space-y-2">
                      {dayBookings.length === 0 && <div className="text-neutral-500 text-sm">Nessuna prenotazione</div>}
                      {dayBookings.map(b => (
                        <div key={b.id} className="p-3 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{b.customer_name || 'Cliente'}</div>
                            <div className="text-xs text-neutral-600">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} – {new Date(b.end_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</div>
                          </div>
                          <button onClick={() => removeBooking(b.id)} className="text-red-500 ml-3">Elimina</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {viewMode === 'month' && (
          <>
            {/* Desktop / Tablet grid */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="grid grid-cols-7 sm:min-w-[700px]">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, i) => (
                  <div key={i} className="p-2 text-center text-sm font-medium border-b border-neutral-200 dark:border-neutral-700">
                    {day}
                  </div>
                ))}
                {getMonthDays(currentDate).map((day, i) => {
                  const dayBookings = getBookingsForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  return (
                    <div key={i} className={`p-2 border-r border-b border-neutral-200 dark:border-neutral-700 min-h-[100px] ${isToday ? 'bg-amber-50 dark:bg-amber-900/10' : ''} ${!isCurrentMonth ? 'opacity-30' : ''}`}>
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-600 dark:text-amber-400' : ''}`}>{day.getDate()}</div>
                      <div className="space-y-1">
                        {dayBookings.slice(0, 2).map(b => (
                          <div key={b.id} className="text-xs p-1 rounded bg-amber-100 dark:bg-amber-900/30 truncate">
                            {b.customer_name || 'Cliente'}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-xs text-neutral-500">+{dayBookings.length - 2}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile stacked list */}
            <div className="sm:hidden p-2">
              {getMonthDays(currentDate).map((day) => {
                const dayBookings = getBookingsForDate(day)
                const isToday = day.toDateString() === new Date().toDateString()
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                return (
                  <div key={day.toDateString()} className={`mb-3 p-3 rounded border ${isToday ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200' : 'border-neutral-200 dark:border-neutral-700'} ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{day.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      <div className="text-sm text-neutral-500">{dayBookings.length} prenotazioni</div>
                    </div>
                    <div className="space-y-2">
                      {dayBookings.length === 0 && <div className="text-neutral-500 text-sm">Nessuna prenotazione</div>}
                      {dayBookings.map(b => (
                        <div key={b.id} className="p-3 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{b.customer_name || 'Cliente'}</div>
                            <div className="text-xs text-neutral-600">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} – {new Date(b.end_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</div>
                          </div>
                          <button onClick={() => removeBooking(b.id)} className="text-red-500 ml-3">Elimina</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* New booking modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Nuova Prenotazione">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nome cliente"
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data e Ora</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pacchetto (opzionale)</label>
            <select
              value={selectedPackage || ''}
              onChange={(e) => setSelectedPackage(e.target.value || null)}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Nessun pacchetto</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name} - €{p.price}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Attrezzatura</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-3">
              {equipment.map((eq) => {
                const selected = selectedEquipment.find(e => e.id === eq.id)
                return (
                  <div key={eq.id} className="flex items-center justify-between">
                    <span className="text-sm">{eq.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEquipmentChange(eq.id, (selected?.quantity || 0) - 1)}
                        className="w-6 h-6 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{selected?.quantity || 0}</span>
                      <button
                        onClick={() => handleEquipmentChange(eq.id, (selected?.quantity || 0) + 1)}
                        className="w-6 h-6 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"
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
            <Button onClick={createBooking} className="flex-1">Crea Prenotazione</Button>
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
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
