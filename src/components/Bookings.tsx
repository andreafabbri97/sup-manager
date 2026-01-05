import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Card from './ui/Card'
import PageTitle from './ui/PageTitle'

type ViewMode = 'day' | 'week' | 'month'

export default function Bookings() {
  const [equipment, setEquipment] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  // detail modal local state (to avoid mutating selectedBooking directly)
  const [detailSelectedEquipment, setDetailSelectedEquipment] = useState<{id: string, quantity: number}[]>([])
  const [detailSelectedPackage, setDetailSelectedPackage] = useState<string | null>(null)
  const [detailDurationMinutes, setDetailDurationMinutes] = useState<number>(60)
  const [detailDurationInput, setDetailDurationInput] = useState<string>(String(60))
  const [detailPrice, setDetailPrice] = useState<number | null>(null)
  const [detailStartTime, setDetailStartTime] = useState<string | null>(null)
  const [detailEndTime, setDetailEndTime] = useState<string | null>(null)
  const [detailCustomerName, setDetailCustomerName] = useState<string>('')
  const [detailInvoiceNumber, setDetailInvoiceNumber] = useState<string | null>(null)
  const [detailNotes, setDetailNotes] = useState<string>('')
  const [detailPaid, setDetailPaid] = useState<boolean>(false)
  const [detailInvoiced, setDetailInvoiced] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<{id: string, quantity: number}[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60) // default duration in minutes
  const [durationInput, setDurationInput] = useState<string>(String(60)) // string state for editing the duration input
  const [computedPrice, setComputedPrice] = useState<number | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, number>>({})
  const [newPaid, setNewPaid] = useState<boolean>(false)
  const [newInvoiced, setNewInvoiced] = useState<boolean>(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState<string | null>(null)
  const [newNotes, setNewNotes] = useState<string>('')

  // Day-list modal state (for +N overflow)
  const [showDayListModal, setShowDayListModal] = useState(false)
  const [modalDay, setModalDay] = useState<Date | null>(null)

  function openDayListModal(day: Date) {
    setModalDay(day)
    setShowDayListModal(true)
  }

  // Helpers for improved display
  function formatTimeRange(b: any) {
    try {
      return `${new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} — ${new Date(b.end_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}`
    } catch { return '' }
  }

  function equipmentCount(b: any) {
    const items = b.equipment_items || []
    return items.reduce((s: number, it: any) => s + (Number(it.quantity || 1)), 0)
  }

  function equipmentLabel(b: any) {
    const items = b.equipment_items || []
    if (!items || items.length === 0) return ''
    if (items.length === 1) {
      const it = items[0]
      const eq = equipment.find(e => e.id === it.id)
      const name = eq?.name || 'Attrezzatura'
      const qty = Number(it.quantity || 1)
      return qty > 1 ? `${qty}x ${name}` : name
    }
    return items.map((it: any) => {
      const eq = equipment.find(e => e.id === it.id)
      const name = eq?.name || 'Attrezzatura'
      const qty = Number(it.quantity || 1)
      return qty > 1 ? `${qty}x ${name}` : name
    }).join(', ')
  }

  // helper: format Date to string suitable for <input type="datetime-local"> (local time)
  function formatToDatetimeLocal(d: string | Date | null) {
    if (!d) return null
    const date = typeof d === 'string' ? new Date(d) : d
    const pad = (n: number) => n.toString().padStart(2, '0')
    const YYYY = date.getFullYear()
    const MM = pad(date.getMonth() + 1)
    const DD = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`
  }

  function bookingTitle(b: any) {
    const parts = []
    parts.push(formatTimeRange(b))
    if (b.customer_name) parts.push(b.customer_name)
    const eqLabel = equipmentLabel(b)
    if (eqLabel) parts.push(eqLabel)
    if (b.price) parts.push(`€ ${Number(b.price).toFixed(2)}`)
    if (b.paid) parts.push('Pagato')
    if (b.invoiced) parts.push('Fatturato')
    if (b.invoice_number) parts.push(`#${b.invoice_number}`)
    if (b.notes) parts.push(b.notes)
    return parts.join(' • ')
  }

  function statusClass(b: any) {
    if (b.paid) return 'border-l-4 border-green-400 dark:border-green-600'
    if (b.invoiced) return 'border-l-4 border-blue-400 dark:border-blue-600'
    return 'border-l-4 border-amber-300 dark:border-amber-600'
  }

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

    // Listen for navigation requests from other components (e.g. NotificationBell)
    const onNavigate = async (ev: any) => {
      try {
        const detail = ev?.detail || {}
        if (detail.bookingId) {
          // try to find booking in memory
          const b = bookings.find((x: any) => x.id === detail.bookingId)
          if (b) {
            setViewMode('day')
            setCurrentDate(new Date(b.start_time))
            setSelectedBooking(b)
            setShowBookingDetails(true)
            return
          }
          // fallback: fetch booking then open
          const { data } = await supabase.from('booking').select('*').eq('id', detail.bookingId).single()
          if (data) {
            setViewMode('day')
            setCurrentDate(new Date(data.start_time))
            setSelectedBooking(data)
            setShowBookingDetails(true)
            return
          }
        }
        if (detail.date) {
          setViewMode('day')
          setCurrentDate(new Date(detail.date))
        }
      } catch (err) {
        console.error('Errore navigazione prenotazione:', err)
      }
    }

    window.addEventListener('navigate:booking', onNavigate)

    return () => {
      window.removeEventListener('sups:changed', handler)
      window.removeEventListener('navigate:booking', onNavigate)
    }
  }, [])

  // recompute price preview when inputs change
  useEffect(() => {
    computePricePreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEquipment, selectedPackage, durationMinutes])

  // sync selected booking into detail modal local state when opened
  useEffect(() => {
    if (!selectedBooking) return
    // compute duration minutes from start/end
    let dMin = 60
    try {
      const s = new Date(selectedBooking.start_time)
      const e = new Date(selectedBooking.end_time)
      const diff = (e.getTime() - s.getTime()) / 60000
      dMin = Number.isFinite(diff) ? Math.max(1, Math.round(diff)) : 60
    } catch {
      dMin = 60
    }

    setDetailSelectedEquipment(Array.isArray(selectedBooking.equipment_items) ? selectedBooking.equipment_items.map((it: any) => ({ id: it.id, quantity: Number(it.quantity || 1) })) : [])
    setDetailSelectedPackage(selectedBooking.package_id || null)
    setDetailDurationMinutes(dMin)
    setDetailDurationInput(String(dMin))
    setDetailStartTime(formatToDatetimeLocal(selectedBooking.start_time || null))
    setDetailEndTime(formatToDatetimeLocal(selectedBooking.end_time || null))
    setDetailPrice(selectedBooking.price ?? null)
    setDetailCustomerName(selectedBooking.customer_name || '')
    setDetailInvoiceNumber(selectedBooking.invoice_number || null)
    setDetailNotes(selectedBooking.notes || '')
    setDetailPaid(!!selectedBooking.paid)
    setDetailInvoiced(!!selectedBooking.invoiced)
  }, [selectedBooking])

  // recompute detail price when detail inputs change
  useEffect(() => {
    if (detailSelectedPackage) {
      const pkg = packages.find(p => p.id === detailSelectedPackage)
      setDetailPrice(pkg ? (pkg.price || 0) : 0)
      return
    }
    if (detailSelectedEquipment.length === 0) { setDetailPrice(null); return }
    const hours = Math.max(0.01, detailDurationMinutes / 60)
    let total = 0
    for (const item of detailSelectedEquipment) {
      const eq = equipment.find(e => e.id === item.id)
      const rate = eq?.price_per_hour ? Number(eq.price_per_hour) : 0
      total += rate * (item.quantity || 1) * hours
    }
    setDetailPrice(Math.round((total + Number.EPSILON) * 100) / 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailSelectedEquipment, detailSelectedPackage, detailDurationMinutes])

  // when package changed, merge package equipment into current selection (non-destructive)
  useEffect(() => {
    if (!detailSelectedPackage) return
    const pkg = packages.find(p => p.id === detailSelectedPackage)
    if (!pkg || !Array.isArray(pkg.equipment_items)) return
    const merged = [...detailSelectedEquipment]
    for (const pei of pkg.equipment_items) {
      const existing = merged.find(m => m.id === pei.id)
      const q = Number(pei.quantity || 1)
      if (existing) existing.quantity = (existing.quantity || 0) + q
      else merged.push({ id: pei.id, quantity: q })
    }
    setDetailSelectedEquipment(merged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailSelectedPackage])

  // compute availability for detail modal (exclude current booking when counting)
  function computeAvailabilityForDetails(equipId: string) {
    const eq = equipment.find(e => e.id === equipId)
    const total = Number(eq?.quantity ?? 1)
    let booked = 0
    const s = detailStartTime ? new Date(detailStartTime) : null
    const e = detailEndTime ? new Date(detailEndTime) : null
    if (!s || !e) return total
    for (const b of bookings) {
      if (!b.start_time || !b.end_time) continue
      if (b.id === selectedBooking?.id) continue
      const bStart = new Date(b.start_time)
      const bEnd = new Date(b.end_time)
      if (!(s < bEnd && bStart < e)) continue
      const items = b.equipment_items || []
      for (const bi of items) {
        if (bi?.id === equipId) booked += Number(bi.quantity || 1)
      }
    }
    return Math.max(0, total - booked)
  }

  // compute availability preview for each equipment based on overlapping bookings
  useEffect(() => {
    computeAvailabilityPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, durationMinutes, bookings, equipment])

  function computeAvailabilityPreview() {
    if (!startTime) { setAvailabilityMap({}); return }
    const start = new Date(startTime)
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + (durationMinutes || 60))

    const map: Record<string, number> = {}
    for (const eq of equipment) {
      // If equipment status is not 'available', consider availability 0
      if (eq?.status && eq.status !== 'available') {
        map[eq.id] = 0
        continue
      }
      const total = Number(eq.quantity ?? 1)
      let booked = 0
      for (const b of bookings) {
        if (!b.start_time || !b.end_time) continue
        const bStart = new Date(b.start_time)
        const bEnd = new Date(b.end_time)
        if (!(start < bEnd && bStart < end)) continue
        const items = b.equipment_items || []
        for (const bi of items) {
          if (bi?.id === eq.id) booked += Number(bi.quantity || 1)
        }
      }
      map[eq.id] = Math.max(0, total - booked)
    }
    setAvailabilityMap(map)
  }

  function resetForm() {
    setSelectedEquipment([])
    setSelectedPackage(null)
    setCustomerName('')
    setStartTime('')
    setDurationMinutes(60)
    setDurationInput('60')
    setComputedPrice(null)
  }

  const handleCloseModal = useCallback(() => {
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

  async function computePricePreview() {
    // compute price locally: if package selected use package.price, else sum equipment price_per_hour * qty * hours
    if (selectedPackage) {
      const pkg = packages.find(p => p.id === selectedPackage)
      setComputedPrice(pkg ? (pkg.price || 0) : 0)
      return
    }
    if (selectedEquipment.length === 0) { setComputedPrice(null); return }
    const hours = Math.max(0.01, durationMinutes / 60)
    let total = 0
    for (const item of selectedEquipment) {
      const eq = equipment.find(e => e.id === item.id)
      const rate = eq?.price_per_hour ? Number(eq.price_per_hour) : 0
      total += rate * (item.quantity || 1) * hours
    }
    setComputedPrice(Math.round((total + Number.EPSILON) * 100) / 100)
  }

  async function createBooking() {
    if (!startTime) return alert('Seleziona data e ora')
    if (selectedEquipment.length === 0 && !selectedPackage) return alert('Seleziona almeno un\'attrezzatura o un pacchetto')

    let duration = durationMinutes || 60 // minutes
    let price = 0

    // Se c'è un pacchetto, usa i suoi parametri
    if (selectedPackage) {
      const pkg = packages.find(p => p.id === selectedPackage)
      if (pkg) {
        duration = pkg.duration || duration
        price = pkg.price || 0
      }
    } else {
      // compute from equipment rates
      const hours = Math.max(0.01, duration / 60)
      for (const item of selectedEquipment) {
        const eq = equipment.find(e => e.id === item.id)
        const rate = eq?.price_per_hour ? Number(eq.price_per_hour) : 0
        price += rate * (item.quantity || 1) * hours
      }
      // round
      price = Math.round((price + Number.EPSILON) * 100) / 100
    }

    const end_time = new Date(startTime)
    end_time.setMinutes(end_time.getMinutes() + duration)

    // Merge package equipment_items (if any) with explicitly selected equipment
    let mergedEquipment: {id: string, quantity: number}[] = [...selectedEquipment]
    if (selectedPackage) {
      const pkg = packages.find(p => p.id === selectedPackage)
      if (pkg && Array.isArray(pkg.equipment_items)) {
        for (const pei of pkg.equipment_items) {
          const existing = mergedEquipment.find(m => m.id === pei.id)
          const q = Number(pei.quantity || 1)
          if (existing) existing.quantity = (existing.quantity || 0) + q
          else mergedEquipment.push({ id: pei.id, quantity: q })
        }
      }
    }

    const bookingData = {
      customer_name: customerName,
      start_time: new Date(startTime).toISOString(),
      end_time: end_time.toISOString(),
      price,
      package_id: selectedPackage,
      equipment_items: mergedEquipment
    }

    // --- Availability check: ensure requested quantities do not exceed available inventory ---
    // For each selected equipment item, sum quantities from existing overlapping bookings
    function timesOverlap(aStart: string | Date, aEnd: string | Date, bStart: string | Date, bEnd: string | Date) {
      const Astart = new Date(aStart)
      const Aend = new Date(aEnd)
      const Bstart = new Date(bStart)
      const Bend = new Date(bEnd)
      return Astart < Bend && Bstart < Aend
    }

    // check availability for merged items (package + manual selection)
    const itemsToCheck = mergedEquipment

    for (const item of itemsToCheck) {
      const eq = equipment.find(e => e.id === item.id)
      // block if equipment status is not available
      if (eq?.status && eq.status !== 'available') return alert(`Attenzione: ${eq?.name || 'attrezzatura'} non è disponibile per le prenotazioni (status: ${eq.status}).`)

      const totalQty = eq?.quantity != null ? Number(eq.quantity) : 1
      let bookedQty = 0

      for (const b of bookings) {
        if (!b.start_time || !b.end_time) continue
        if (!timesOverlap(startTime, end_time.toISOString(), b.start_time, b.end_time)) continue
        const items = b.equipment_items || []
        for (const bi of items) {
          if (bi?.id === item.id) bookedQty += Number(bi.quantity || 1)
        }
      }

      const availableNow = Math.max(0, totalQty - bookedQty)
      if ((item.quantity || 1) > availableNow) {
        return alert(`Disponibilità insufficiente per ${eq?.name || 'attrezzatura'}: disponibili ${availableNow}, richiesti ${item.quantity || 1}`)
      }
    }

    // Use server-side RPC to ensure transactional availability checks
    try {
      const { data, error } = await supabase.rpc('create_booking', {
        p_customer_name: bookingData.customer_name,
        p_start: bookingData.start_time,
        p_end: bookingData.end_time,
        p_price: bookingData.price,
        p_package: bookingData.package_id,
        p_equipment_items: bookingData.equipment_items
      })
      if (error) throw error
      // RPC returns the created booking id (table result). Update paid/invoiced if user set them at creation
      const createdId = Array.isArray(data) ? data[0]?.id : (data?.id ?? null)
      if (createdId && (newPaid || newInvoiced || newInvoiceNumber)) {
        const payload: any = {}
        if (newPaid) payload.paid = true
        if (newPaid) payload.paid_at = new Date().toISOString()
        if (newInvoiced !== undefined) payload.invoiced = newInvoiced
        if (newInvoiceNumber) payload.invoice_number = newInvoiceNumber
        if (newNotes) payload.notes = newNotes
        const { error: upErr } = await supabase.from('booking').update(payload).eq('id', createdId)
        if (upErr) throw upErr
      }
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes("Could not find")) {
        alert("Errore: la colonna 'equipment_items' non è riconosciuta dal server. Assicurati di aver eseguito le migrazioni su Supabase e poi ricarica la pagina (F5). Se l'errore persiste, riavvia il progetto Supabase dal pannello Settings → Database → Restart e riprova.")
      } else if (msg.includes('Disponibilità insufficiente')) {
        alert('Disponibilità insufficiente per l\'attrezzatura selezionata. Riduci la quantità selezionata o verifica la disponibilità nel pannello Attrezzatura.')
      } else {
        alert(msg)
      }
      return
    }
    
    resetForm()
    setShowModal(false)
    setNewPaid(false)
    setNewInvoiced(false)
    setNewInvoiceNumber(null)
    setNewNotes('')
    load()
  }

  async function removeBooking(id: string) {
    if (!confirm('Eliminare questa prenotazione?')) return
    const { error } = await supabase.from('booking').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function saveBookingChanges(updated: any) {
    const { id, customer_name, start_time, end_time, price, package_id, equipment_items, paid, invoiced, invoice_number, notes } = updated
    const updatePayload: any = { customer_name, start_time, end_time, price, package_id, equipment_items, notes }
    if (paid !== undefined) updatePayload.paid = paid
    if (invoiced !== undefined) updatePayload.invoiced = invoiced
    if (invoice_number !== undefined) updatePayload.invoice_number = invoice_number

    const { error } = await supabase.from('booking').update(updatePayload).eq('id', id)
    if (error) return alert(error.message)
    load()
    setShowBookingDetails(false)
    setSelectedBooking(null)
  }

  async function togglePaidForBooking(id: string, paid: boolean) {
    const paid_at = paid ? new Date().toISOString() : null
    const { error } = await supabase.from('booking').update({ paid, paid_at }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function toggleInvoicedForBooking(id: string, invoiced: boolean) {
    const { error } = await supabase.from('booking').update({ invoiced }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function markPaid(id: string) {
    const paidAt = new Date().toISOString()
    const invoiced = confirm('Hai emesso fattura per questa prenotazione? Premi OK se sì, Annulla se no')
    const { error } = await supabase.from('booking').update({ paid: true, paid_at: paidAt, invoiced }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  // Calendar utilities
  function getWeekDays(date: Date) {
    const start = new Date(date)
    // compute Monday of the week that contains `date` (Monday-first week)
    // JS getDay(): 0 = Sunday, 1 = Monday, ...
    const dayIndex = (start.getDay() + 6) % 7 // 0 = Monday, 6 = Sunday
    start.setDate(start.getDate() - dayIndex)
    return Array.from({ length: 7 }, (_, i) => {
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
          <PageTitle className="m-0">Calendario Prenotazioni</PageTitle>
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
          <div className="text-sm font-medium min-w-[120px] sm:min-w-[200px] text-center">{getDateRangeLabel()}</div>
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
              <div className="space-y-1">
              {getBookingsForDate(currentDate).map(b => (
                <button key={b.id} title={bookingTitle(b)} onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }} className={`w-full text-left p-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-amber-50/70 dark:bg-neutral-800/60 interactive ${statusClass(b)} min-h-[56px] sm:min-h-[48px]`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="font-medium truncate text-neutral-900 dark:text-neutral-100 text-lg sm:text-base">{b.customer_name || 'Cliente'}</div>
                        <div className="text-sm text-neutral-500">{formatTimeRange(b)}</div>
                      </div>
                      <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{b.notes ? (b.notes.length > 100 ? b.notes.slice(0,100) + '…' : b.notes) : ''}</div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <div className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-sm font-medium text-neutral-700 dark:text-neutral-200">{equipmentLabel(b)}</div>
                        {b.invoice_number && <div className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">#{b.invoice_number}</div>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {b.price && <div className="text-amber-500 dark:text-amber-300 font-bold text-lg whitespace-nowrap">€ {Number(b.price).toFixed(2)}</div>}
                      <div className="flex items-center gap-2">
                        {!b.paid && (
                          <button onClick={(e)=>{ e.stopPropagation(); markPaid(b.id) }} className="text-green-600 hover:text-green-700 p-1 focus-ring" title="Registra incasso">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {b.paid && <div className="text-sm text-green-600 font-semibold">Pagato</div>}
                        {b.invoiced && <div className="text-sm text-blue-600 font-semibold">Fatturato</div>}
                        <button onClick={(e)=>{ e.stopPropagation(); removeBooking(b.id) }} className="text-red-500 hover:text-red-600 p-1 focus-ring" title="Elimina">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
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
            <div className="hidden sm:block">
              <div className="grid grid-cols-7 gap-2">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, i) => (
                  <div key={i} className="p-2 text-center text-sm font-medium border-b border-neutral-200 dark:border-neutral-700">
                    {day}
                  </div>
                ))}
                {getWeekDays(currentDate).map((day, i) => {
                  const dayBookings = getBookingsForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} className={`p-3 border-r border-b border-neutral-200 dark:border-neutral-700 min-h-[180px] ${isToday ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                      <div className={`text-base font-medium mb-3 ${isToday ? 'text-amber-600 dark:text-amber-400' : ''}`}>{day.getDate()}</div>
                      <div className="space-y-2">
                        {dayBookings.slice(0,3).map(b => (
                          <Card as="button" key={b.id} title={bookingTitle(b)} onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }} className={`w-full text-left text-sm p-2.5 rounded-md bg-amber-100 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 interactive ${statusClass(b)} min-h-[64px]`}>
                            <div className="flex flex-col gap-1.5">
                              <div className="font-medium">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} — {b.customer_name || 'Cliente'}</div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="text-neutral-600 dark:text-neutral-400">{equipmentCount(b)}×</div>
                                {!b.paid && <button onClick={(e)=>{ e.stopPropagation(); markPaid(b.id) }} className="text-green-600 hover:text-green-700 focus-ring px-1.5 py-0.5 rounded bg-white/50 dark:bg-neutral-700/50">Registra</button>}
                                {b.paid && <span className="text-green-600 dark:text-green-400 font-semibold">Pagato</span>}
                                <button onClick={(e)=>{ e.stopPropagation(); removeBooking(b.id) }} className="text-red-500 hover:text-red-600 focus-ring px-1.5 py-0.5 rounded bg-white/50 dark:bg-neutral-700/50">Elimina</button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {dayBookings.length > 3 && (
                          <button onClick={() => openDayListModal(day)} className="text-xs text-neutral-500 hover:underline">+{dayBookings.length - 3} altre prenotazioni</button>
                        )}
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
                        <Card as="button" key={b.id} onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }} className="w-full text-left p-3 rounded bg-amber-100 dark:bg-neutral-800/60 flex items-center justify-between interactive">
                          <div>
                            <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{b.customer_name || 'Cliente'}</div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-300">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} – {new Date(b.end_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</div>
                            {b.paid && <div className="text-xs text-green-500 dark:text-green-300 font-semibold">Pagato</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            {!b.paid && <button onClick={(e)=>{ e.stopPropagation(); markPaid(b.id) }} className="text-green-600 ml-3 focus-ring">Registra incasso</button>}
                            <button onClick={(e)=>{ e.stopPropagation(); removeBooking(b.id) }} className="text-red-500 ml-3 focus-ring">Elimina</button>
                          </div>
                        </Card>
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
            <div className="hidden sm:block">
              <div className="grid grid-cols-7">
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
                          <Card as="button" key={b.id} title={bookingTitle(b)} onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }} className={`w-full text-left text-xs p-2 rounded bg-amber-100 dark:bg-amber-900/30 truncate ${statusClass(b)} interactive`}>
                            <div className="flex items-start justify-between">
                              <div className="truncate">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} — {b.customer_name || 'Cliente'}</div>
                              <div className="flex items-center gap-2">
                                <div className="text-amber-600 text-xs">{b.price ? `€ ${Number(b.price).toFixed(2)}` : ''}</div>
                                <div className="text-xs text-neutral-500">{equipmentCount(b)}×</div>
                              </div>
                            </div>
                            {b.paid && <div className="text-xs text-green-500 font-semibold">Pagato</div>}
                          </Card>
                        ))}
                        {dayBookings.length > 2 && (
                          <button onClick={() => openDayListModal(day)} className="text-xs text-neutral-500 hover:underline">+{dayBookings.length - 2} altre prenotazioni</button>
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
                        <button key={b.id} onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }} className="w-full text-left p-3 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{b.customer_name || 'Cliente'}</div>
                            <div className="text-xs text-neutral-600">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} – {new Date(b.end_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</div>
                            {b.price && <div className="text-sm text-amber-600">€ {b.price}</div>}
                            {b.paid && <div className="text-xs text-green-500 font-semibold">Pagato</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            {!b.paid && <button onClick={(e)=>{ e.stopPropagation(); markPaid(b.id) }} className="text-green-600 ml-3 focus-ring">Registra</button>}
                            <button onClick={(e)=>{ e.stopPropagation(); removeBooking(b.id) }} className="text-red-500 ml-3">Elimina</button>
                          </div>
                        </button>
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
      <Modal isOpen={showModal} onClose={handleCloseModal} title="Nuova Prenotazione">
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
            <label className="block text-sm font-medium mb-2">Durata (minuti)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={durationInput}
              onChange={(e)=>{ const v = e.target.value; if (/^\d*$/.test(v)) setDurationInput(v); }}
              onBlur={()=>{ const v = durationInput.trim(); const n = v === '' ? 60 : Number(v); setDurationMinutes(n); setDurationInput(String(n)); }}
              className="w-full border px-2 py-2 rounded" />
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
                const isAvailable = !(eq?.status && eq.status !== 'available')
                const availCount = isAvailable ? (availabilityMap[eq.id] ?? (eq.quantity ?? 1)) : 0
                return (
                  <div key={eq.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{eq.name}</div>
                        <div className={`inline-block px-2 py-0.5 text-xs rounded ${isAvailable ? 'bg-green-100 text-green-800' : eq.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{isAvailable ? 'Disponibile' : (eq.status === 'maintenance' ? 'Manutenzione' : 'Ritirata')}</div>
                      </div>
                      <div className="text-xs text-neutral-400">€ {eq.price_per_hour ?? 0} / ora — <span className="text-neutral-500">Disponibili: {availCount}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEquipmentChange(eq.id, (selected?.quantity || 0) - 1)}
                        disabled={(selected?.quantity || 0) <= 0 || !isAvailable}
                        aria-disabled={(selected?.quantity || 0) <= 0 || !isAvailable}
                        className={`w-8 h-8 rounded ${ (!isAvailable || (selected?.quantity || 0) <= 0) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm font-medium">{selected?.quantity || 0}</span>
                      <button
                        onClick={() => handleEquipmentChange(eq.id, (selected?.quantity || 0) + 1)}
                        disabled={!isAvailable || availCount <= (selected?.quantity || 0)}
                        aria-disabled={!isAvailable || availCount <= (selected?.quantity || 0)}
                        className={`w-8 h-8 rounded ${ (!isAvailable || availCount <= (selected?.quantity || 0)) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="sm:col-span-1">
              <div className="text-sm text-neutral-500">Prezzo stimato</div>
              <div className="text-xl font-bold">{computedPrice !== null ? computedPrice.toFixed(2) + ' €' : '-'} </div>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Note (opzionale)</label>
              <textarea value={newNotes} onChange={(e)=>setNewNotes(e.target.value)} className="w-full border px-2 py-2 rounded" rows={2} />
              <div className="mt-3 flex items-center gap-4">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={newPaid} onChange={(e)=>setNewPaid(e.target.checked)} /> Pagata
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={newInvoiced} onChange={(e)=>setNewInvoiced(e.target.checked)} /> Fatturata
                </label>
              </div>
              {newInvoiced && (
                <input value={newInvoiceNumber ?? ''} onChange={(e)=>setNewInvoiceNumber(e.target.value||null)} placeholder="Numero fattura (opzionale)" className="w-full border px-2 py-2 rounded mt-2" />
              )}
            </div>
            <div className="sm:col-span-1 flex flex-col gap-3">
              <Button onClick={createBooking} className="w-full">Crea Prenotazione</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Day bookings modal (all bookings for a selected date) */}
      <Modal isOpen={showDayListModal} onClose={() => { setShowDayListModal(false); setModalDay(null) }} title={modalDay ? `Prenotazioni ${modalDay.toLocaleDateString('it-IT')}` : 'Prenotazioni'}>
        {modalDay && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {getBookingsForDate(modalDay).length === 0 && <div className="text-neutral-500">Nessuna prenotazione</div>}
            {getBookingsForDate(modalDay).map(b => (
              <div key={b.id} className={`p-3 rounded border ${statusClass(b)} bg-amber-50 dark:bg-neutral-800/50`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{formatTimeRange(b)} — {b.customer_name || 'Cliente'}</div>
                      <div className="text-sm text-neutral-500">{b.price ? `€ ${Number(b.price).toFixed(2)}` : ''}</div>
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{b.notes ? (b.notes.length > 150 ? b.notes.slice(0,150) + '…' : b.notes) : ''}</div>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <div className="text-neutral-500">{equipmentCount(b)} attrezzatura{equipmentCount(b) > 1 ? 'e' : ''}</div>
                      {b.paid && <div className="text-green-600 font-semibold">Pagato</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedBooking(b); setShowBookingDetails(true); setShowDayListModal(false) }} className="text-sm px-3 py-1 rounded bg-white/50 dark:bg-neutral-700/50">Dettagli</button>
                    {!b.paid && <button onClick={() => { markPaid(b.id) }} className="text-sm px-3 py-1 rounded bg-green-600 text-white">Segna come pagato</button>}
                    <button onClick={() => { if (confirm('Eliminare questa prenotazione?')) { removeBooking(b.id); } }} className="text-sm px-3 py-1 rounded border text-red-500">Elimina</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={showBookingDetails} onClose={() => { setShowBookingDetails(false); setSelectedBooking(null) }} title="Dettaglio Prenotazione" autoFocus={false}>
        {selectedBooking && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cliente</label>
              <input value={detailCustomerName} onChange={(e)=>setDetailCustomerName(e.target.value)} className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pacchetto (opzionale)</label>
              <select value={detailSelectedPackage || ''} onChange={(e)=>{ setDetailSelectedPackage(e.target.value || null) }} className="w-full border px-3 py-2 rounded">
                <option value="">Nessun pacchetto</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - €{p.price}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Attrezzatura</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-3">
                {equipment.map((eq) => {
                  const selected = detailSelectedEquipment.find(e => e.id === eq.id)
                  const avail = computeAvailabilityForDetails(eq.id)
                  return (
                    <div key={eq.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{eq.name}</div>
                        <div className="text-xs text-neutral-400">€ {eq.price_per_hour ?? 0} / ora — <span className="text-neutral-500">Disponibili: {avail}</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          const q = (selected?.quantity || 0) - 1
                          if (q <= 0) setDetailSelectedEquipment(detailSelectedEquipment.filter(d => d.id !== eq.id))
                          else setDetailSelectedEquipment(detailSelectedEquipment.map(d => d.id === eq.id ? {...d, quantity: q} : d))
                        }} disabled={(selected?.quantity || 0) <= 0} className={`w-6 h-6 rounded ${ (selected?.quantity || 0) <= 0 ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}>-</button>
                        <span className="w-8 text-center text-sm font-medium">{selected?.quantity || 0}</span>
                        <button onClick={() => {
                          const current = selected?.quantity || 0
                          if ((avail ?? 0) <= current) return
                          if (selected) setDetailSelectedEquipment(detailSelectedEquipment.map(d => d.id === eq.id ? {...d, quantity: d.quantity + 1} : d))
                          else setDetailSelectedEquipment([...detailSelectedEquipment, { id: eq.id, quantity: 1 }])
                        }} disabled={(avail ?? 0) <= (selected?.quantity || 0)} className={`w-6 h-6 rounded ${ (avail ?? 0) <= (selected?.quantity || 0) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}>+</button>
                      </div>
                    </div>
                  )
                })}
                {equipment.length === 0 && <div className="text-sm text-neutral-500 text-center py-4">Nessuna attrezzatura disponibile</div>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Durata (minuti)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={detailDurationInput}
                onChange={(e)=>{ const v = e.target.value; if (/^\d*$/.test(v)) setDetailDurationInput(v); }}
                onBlur={()=>{ const v = detailDurationInput.trim(); const n = v === '' ? 60 : Number(v); setDetailDurationMinutes(n); const s = detailStartTime ? new Date(detailStartTime) : null; if (s) { const end = new Date(s); end.setMinutes(end.getMinutes() + n); setDetailEndTime(formatToDatetimeLocal(end)) } setDetailDurationInput(String(n)); }}
                className="w-full border px-2 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data e Ora Inizio</label>
              <input type="datetime-local" value={detailStartTime ?? ''} onChange={(e)=>{ const v = e.target.value; setDetailStartTime(v); if (v) { const s = new Date(v); const end = new Date(s); end.setMinutes(end.getMinutes() + detailDurationMinutes); setDetailEndTime(formatToDatetimeLocal(end)) } }} className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data e Ora Fine</label>
              <input type="datetime-local" value={detailEndTime ?? ''} onChange={(e)=>{ const v = e.target.value; setDetailEndTime(v); if (detailStartTime) { const s = new Date(detailStartTime); const eD = new Date(v); const diff = Math.round((eD.getTime() - s.getTime())/60000); setDetailDurationMinutes(diff>0?diff:detailDurationMinutes) } }} className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm text-neutral-500">Prezzo</label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" value={detailPrice ?? ''} onChange={(e)=>setDetailPrice(e.target.value === '' ? null : Number(e.target.value))} className="w-full border px-3 py-2 rounded" />
                <div className="text-sm text-neutral-500">€</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Numero Fattura (opzionale)</label>
              <input value={detailInvoiceNumber || ''} onChange={(e)=>setDetailInvoiceNumber(e.target.value || null)} className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Note (opzionale)</label>
              <textarea value={detailNotes} onChange={(e)=>setDetailNotes(e.target.value)} className="w-full border px-3 py-2 rounded" rows={3} />
            </div>

            <div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={detailPaid} onChange={(e)=>setDetailPaid(e.target.checked)} />
                Pagata
              </label>
            </div>

            <div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={detailInvoiced} onChange={(e)=>setDetailInvoiced(e.target.checked)} />
                Fatturata
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => {
                // build updated object and save
                const id = selectedBooking.id
                const start_iso = detailStartTime ? new Date(detailStartTime).toISOString() : selectedBooking.start_time
                const end_iso = detailEndTime ? new Date(detailEndTime).toISOString() : selectedBooking.end_time
                const updated = {
                  id,
                  customer_name: detailCustomerName,
                  start_time: start_iso,
                  end_time: end_iso,
                  price: detailPrice,
                  package_id: detailSelectedPackage,
                  equipment_items: detailSelectedEquipment,
                  paid: detailPaid,
                  invoiced: detailInvoiced,
                  invoice_number: detailInvoiceNumber,
                  notes: detailNotes
                }
                saveBookingChanges(updated)
              }} className="bg-amber-500 text-white px-4 py-2 rounded">Salva</button>
              <button onClick={() => { if (confirm('Eliminare questa prenotazione?')) { removeBooking(selectedBooking.id); setShowBookingDetails(false); setSelectedBooking(null) } }} className="px-4 py-2 rounded border">Elimina</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
