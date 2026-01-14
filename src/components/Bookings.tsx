import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Card from './ui/Card'
import PageTitle from './ui/PageTitle'

type ViewMode = 'day' | 'month'

export default function Bookings() {
  const [equipment, setEquipment] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState<boolean>(true)
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  // detail modal local state (to avoid mutating selectedBooking directly)
  const [detailSelectedEquipment, setDetailSelectedEquipment] = useState<{id: string, quantity: number}[]>([])
  const [detailSelectedPackages, setDetailSelectedPackages] = useState<{id: string, quantity: number}[]>([])
  const [detailSelectedPackage, setDetailSelectedPackage] = useState<string | null>(null) // legacy single-package support
  const [detailDurationMinutes, setDetailDurationMinutes] = useState<number>(60)
  const [detailDurationInput, setDetailDurationInput] = useState<string>(String(60))
  const [detailPrice, setDetailPrice] = useState<number | null>(null)
  const [detailPriceManual, setDetailPriceManual] = useState<boolean>(false)
  const [detailStartTime, setDetailStartTime] = useState<string | null>(null)
  const [detailEndTime, setDetailEndTime] = useState<string | null>(null)
  const [detailCustomerName, setDetailCustomerName] = useState<string>('')
  const [detailCustomerPhone, setDetailCustomerPhone] = useState<string>('')
  const [detailInvoiceNumber, setDetailInvoiceNumber] = useState<string | null>(null)
  const [detailNotes, setDetailNotes] = useState<string>('')
  const [detailPaid, setDetailPaid] = useState<boolean>(false)
  const [detailInvoiced, setDetailInvoiced] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<{id: string, quantity: number}[]>([])
  const [selectedPackages, setSelectedPackages] = useState<{id: string, quantity: number}[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60) // default duration in minutes
  const [durationInput, setDurationInput] = useState<string>(String(60)) // string state for editing the duration input
  const [computedPrice, setComputedPrice] = useState<number | null>(null)
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [priceInput, setPriceInput] = useState<string>('') // string state for editing the price input
  const [isPriceManual, setIsPriceManual] = useState(false)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, number>>({})
  const [newPaid, setNewPaid] = useState<boolean>(false)
  const [newInvoiced, setNewInvoiced] = useState<boolean>(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState<string | null>(null)
  const [newNotes, setNewNotes] = useState<string>('')
  
  // Customer matching & suggestion modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [pendingCustomerData, setPendingCustomerData] = useState<{name: string, phone: string} | null>(null)
  const [pendingBookingData, setPendingBookingData] = useState<any | null>(null)
  
  // Autocomplete state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Day-list modal state (for +N overflow)
  const [showDayListModal, setShowDayListModal] = useState(false)
  const [modalDay, setModalDay] = useState<Date | null>(null)

  // Mark-paid modal state
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [markPaidBooking, setMarkPaidBooking] = useState<any | null>(null)
  const [markPaidInvoiced, setMarkPaidInvoiced] = useState<'yes'|'no' | null>(null)
  const [markPaidInvoiceNumber, setMarkPaidInvoiceNumber] = useState<string | null>(null)

  // Mobile tap interactions (tap-to-expand animation)
  const touchTimer = React.useRef<number | null>(null)
  const [pressedDay, setPressedDay] = useState<string | null>(null)

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

  // Helper: format phone for WhatsApp
  function formatPhoneForWhatsApp(p?: string): string | null {
    if (!p) return null
    let s = p.replace(/\D+/g, '')
    if (!s) return null
    if (s.startsWith('00')) s = s.replace(/^00/, '')
    if (s.startsWith('0')) s = '39' + s.replace(/^0+/, '')
    if (s.length < 7) return null
    return s
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

  // Compact dot indicator used in month grid
  function compactDot(b: any) {
    const color = b.paid ? 'bg-green-500' : b.invoiced ? 'bg-blue-500' : 'bg-amber-500'
    return (
      <span title={bookingTitle(b)} className={`inline-block w-2 h-2 rounded-full ${color} mr-1`}></span>
    )
  }

  function statusClass(b: any) {
    if (b.paid) return 'border-l-4 border-green-400 dark:border-green-600'
    if (b.invoiced) return 'border-l-4 border-blue-400 dark:border-blue-600'
    return 'border-l-4 border-amber-300 dark:border-amber-600'
  }

  const loadRequestId = useRef(0)

  async function load(opts?: { background?: boolean }) {
    const isBackground = !!opts?.background
    if (!isBackground) setLoadingBookings(true)
    const myId = ++loadRequestId.current
    try {
      // Carica solo prenotazioni degli ultimi 3 mesi e prossimi 3 mesi per velocizzare
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const threeMonthsAhead = new Date()
      threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3)
      
      // Query parallele per caricare più velocemente
      const [
        { data: eq },
        { data: p },
        { data: b },
        { data: c }
      ] = await Promise.all([
        supabase.from('equipment').select('*').order('name'),
        supabase.from('package').select('*'),
        supabase.from('booking').select('*').gte('start_time', threeMonthsAgo.toISOString()).lte('start_time', threeMonthsAhead.toISOString()).order('start_time', { ascending: true }),
        supabase.from('customers').select('*').order('name')
      ])

      // Applica l'aggiornamento solo se questa è l'ultima richiesta (evita race conditions)
      if (myId === loadRequestId.current) {
        setEquipment(eq || [])
        setPackages(p || [])
        setBookings(b || [])
        setCustomers(c || [])
      }
      // In caso di risposta incompleta manterremo il precedente bookings (cioè non sovrascriviamo con [])
    } catch (err) {
      console.error('Errore nel caricamento prenotazioni:', err)
      // Non svuotiamo lo stato esistente in caso di errore
    } finally {
      if (!isBackground) setLoadingBookings(false)
    }
  }

  useEffect(() => {
    load()

    const handler = () => load()
    window.addEventListener('sups:changed', handler)

    // realtime booking updates (debounced)
    const realtimeTimer = { id: 0 as any }
    const onRealtimeBooking = () => {
      if (realtimeTimer.id) clearTimeout(realtimeTimer.id)
      realtimeTimer.id = window.setTimeout(() => { load(); realtimeTimer.id = 0 }, 300)
    }
    window.addEventListener('realtime:booking', onRealtimeBooking as any)

    // When a realtime booking arrives, invalidate day cache for affected day(s)
    const onRealtimeBookingInvalidate = (ev: any) => {
      try {
        const b = ev?.detail
        if (!b || !b.start_time) return
        const d = new Date(b.start_time)
        const key = dateKey(d)
        setDayBookingsCache(prev => ({ ...prev, [key]: undefined }))
      } catch (err) {
        // ignore
      }
    }
    window.addEventListener('realtime:booking:changed', onRealtimeBookingInvalidate as any)

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
      } catch (err) {
        // ignore
      }
    }
    window.addEventListener('sups:navigate', onNavigate as any)

    return () => {
      window.removeEventListener('sups:changed', handler)
      window.removeEventListener('realtime:booking', onRealtimeBooking as any)
      window.removeEventListener('sups:navigate', onNavigate as any)
    }
  }, [])

  // Render helper for day list to simplify inline JSX
  function renderDayList() {
    if (loadingBookings) return (
      <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
        <svg className="animate-spin inline-block w-6 h-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        Caricamento prenotazioni…
      </div>
    )
    const dayList = getBookingsForDate(currentDate)
    if (dayList.length === 0) return <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">Nessuna prenotazione per questa giornata</div>
    return dayList.map(b => (
      <div key={b.id} role="button" tabIndex={0} title={bookingTitle(b)} onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }} className={`w-full text-left p-4 rounded-md bg-amber-50/70 dark:bg-neutral-800/60 interactive ${statusClass(b)} min-h-[56px] sm:min-h-[48px] ${b.paid ? 'border border-green-400 dark:border-green-600' : (b.invoiced ? 'border border-blue-400 dark:border-blue-600' : 'border border-amber-300 dark:border-amber-600')}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium truncate text-neutral-900 dark:text-neutral-100 text-lg sm:text-base">{b.customer_name || 'Cliente'}</div>
              {formatPhoneForWhatsApp(b.customer_phone) && (
                <a href={`https://wa.me/${formatPhoneForWhatsApp(b.customer_phone)}`} target="_blank" rel="noopener noreferrer" title="Apri chat WhatsApp" onClick={(e)=>e.stopPropagation()} className="inline-flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 175.216 175.552" aria-hidden="true">
                    <circle fill="#25D366" cx="87.608" cy="87.776" r="87.608"/>
                    <path fill="#FFFFFF" d="M126.88 48.572c-9.304-9.304-21.664-14.432-34.848-14.432-27.136 0-49.216 22.08-49.216 49.216 0 8.672 2.272 17.152 6.56 24.608l-6.976 25.472 26.048-6.816c7.232 3.936 15.36 6.016 23.584 6.016h.032c27.136 0 49.216-22.08 49.216-49.216 0-13.152-5.12-25.504-14.4-34.848zm-34.848 75.776h-.032c-7.328 0-14.528-1.952-20.8-5.632l-1.504-.896-15.488 4.064 4.128-15.104-.992-1.568c-4.032-6.4-6.176-13.792-6.176-21.408 0-22.176 18.048-40.224 40.256-40.224 10.752 0 20.864 4.192 28.448 11.808 7.584 7.584 11.776 17.664 11.776 28.416-.032 22.208-18.08 40.256-40.256 40.256zm22.08-30.144c-1.216-.608-7.136-3.52-8.224-3.904-1.088-.416-1.888-.608-2.688.608-.8 1.216-3.104 3.904-3.808 4.704-.704.8-1.408 .928-2.624.32-1.216-.608-5.12-1.888-9.76-6.016-3.616-3.2-6.048-7.168-6.752-8.384-.704-1.216-.064-1.888.544-2.496.544-.544 1.216-1.408 1.824-2.112.608-.704.8-1.216 1.216-2.016.416-.8.192-1.504-.096-2.112-.32-.608-2.688-6.464-3.68-8.864-.96-2.304-1.984-2.016-2.688-2.048-.704-.032-1.504-.032-2.304-.032s-2.112.32-3.2 1.504c-1.088 1.216-4.16 4.064-4.16 9.92s4.256 11.52 4.864 12.32c.608.8 8.672 13.216 21.024 18.528 2.944 1.28 5.248 2.048 7.04 2.624 2.944.96 5.632.832 7.744.512 2.368-.352 7.136-2.912 8.128-5.728.992-2.816.992-5.248.672-5.76-.288-.544-1.088-.864-2.304-1.472z"/>
                  </svg>
                </a>
              )}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{formatTimeRange(b)}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{equipmentLabel(b)}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{b.notes ? (b.notes.length > 150 ? b.notes.slice(0,150) + '…' : b.notes) : ''}</div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {b.price && <div className="text-amber-500 dark:text-amber-300 font-bold text-xl whitespace-nowrap">€ {Number(b.price).toFixed(2)}</div>}
            <div className="flex flex-col items-end gap-2 mt-1">
              {!b.paid && (
                <button onClick={(e)=>{ e.stopPropagation(); setMarkPaidBooking(b); setMarkPaidInvoiced(null); setMarkPaidInvoiceNumber(null); setShowMarkPaidModal(true) }} className="text-sm px-3 py-1 rounded bg-green-600 text-white" title="Segna come pagato">Segna come pagato</button>
              )}
              {b.paid && <div className="text-sm text-green-600 font-semibold">Pagato</div>}
              {b.invoiced && <div className="text-sm text-blue-600 font-semibold">Fatturato</div>}
            </div>
          </div>
        </div>
      </div>
    ))
  }

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowCustomerDropdown(false)
    if (showCustomerDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showCustomerDropdown])

  // recompute price preview when inputs change
  useEffect(() => {
    computePricePreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEquipment, selectedPackages, durationMinutes])

  // Sync priceInput with computed price when not manually edited
  useEffect(() => {
    if (!isPriceManual) {
      setPriceInput(computedPrice !== null ? String(computedPrice) : '0')
    }
  }, [computedPrice, isPriceManual])

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

    // Sync selection into modal state
    const selEquip = Array.isArray(selectedBooking.equipment_items) ? selectedBooking.equipment_items.map((it: any) => ({ id: it.id, quantity: Number(it.quantity || 1) })) : []
    setDetailSelectedEquipment(selEquip)
    // If booking has package_items (new format), use that
    if (Array.isArray(selectedBooking.package_items) && selectedBooking.package_items.length > 0) {
      setDetailSelectedPackages(selectedBooking.package_items.map((sp: any) => ({ id: sp.id, quantity: sp.quantity || 1 })))
      setDetailSelectedPackage(null)
    } else if (selectedBooking.package_id) {
      // Legacy: single package FK
      setDetailSelectedPackages([{ id: selectedBooking.package_id, quantity: 1 }])
      setDetailSelectedPackage(selectedBooking.package_id)
    } else if (Array.isArray(selectedBooking._source_packages) && selectedBooking._source_packages.length > 0) {
      // If booking was created with multiple packages we might store them in a synthetic field (_source_packages) when creating bookings via new UI
      setDetailSelectedPackages(selectedBooking._source_packages.map((sp: any) => ({ id: sp.id, quantity: sp.quantity || 1 })))
      setDetailSelectedPackage(null)
    } else {
      setDetailSelectedPackages([])
      setDetailSelectedPackage(null)
    }
    setDetailDurationMinutes(dMin)
    setDetailDurationInput(String(dMin))
    setDetailStartTime(formatToDatetimeLocal(selectedBooking.start_time || null))
    setDetailEndTime(formatToDatetimeLocal(selectedBooking.end_time || null))

    // Determine expected/computed price based on package or equipment so we can detect if the stored booking price is a manual override
    let expectedPrice: number | null = null
    if (selectedBooking.package_id) {
      const pkg = packages.find((p: any) => p.id === selectedBooking.package_id)
      expectedPrice = pkg ? (Number(pkg.price || 0)) : 0
    } else if (selEquip.length > 0) {
      const hours = Math.max(0.01, dMin / 60)
      let total = 0
      for (const item of selEquip) {
        const eq = equipment.find(e => e.id === item.id)
        const rate = eq?.price_per_hour ? Number(eq.price_per_hour) : 0
        total += rate * (item.quantity || 1) * hours
      }
      expectedPrice = Math.round((total + Number.EPSILON) * 100) / 100
    }

    const storedPrice = selectedBooking.price ?? null
    if (storedPrice !== null && expectedPrice !== null && Number(storedPrice) !== Number(expectedPrice)) {
      // booking has a manual price different from computed -> preserve it
      setDetailPrice(storedPrice)
      setDetailPriceManual(true)
    } else {
      // otherwise show computed price (or stored if computed not available)
      setDetailPrice(expectedPrice !== null ? expectedPrice : (storedPrice ?? null))
      setDetailPriceManual(false)
    }

    setDetailCustomerName(selectedBooking.customer_name || '')
    setDetailCustomerPhone(selectedBooking.customer_phone || '')
    setDetailInvoiceNumber(selectedBooking.invoice_number || null)
    setDetailNotes(selectedBooking.notes || '')
    setDetailPaid(!!selectedBooking.paid)
    setDetailInvoiced(!!selectedBooking.invoiced)
  }, [selectedBooking, equipment, packages])

  // recompute detail price when detail inputs change
  useEffect(() => {
    if (detailPriceManual) return
    // If any package selected, compute package price sum
    if (detailSelectedPackages.length > 0) {
      let totalP = 0
      for (const sp of detailSelectedPackages) {
        const pkg = packages.find(p => p.id === sp.id)
        if (pkg) totalP += (Number(pkg.price || 0)) * (sp.quantity || 1)
      }
      setDetailPrice(Math.round((totalP + Number.EPSILON) * 100) / 100)
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
  }, [detailSelectedEquipment, detailSelectedPackages, detailDurationMinutes, detailPriceManual])

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
    // If equipment status is not 'available', consider availability 0 (same behavior as create flow)
    if (eq?.status && eq.status !== 'available') return 0
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
  }, [startTime, durationMinutes, bookings, equipment, selectedPackages, selectedEquipment])

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
      
      // Subtract equipment from existing bookings in the same time slot
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
      
      // Subtract equipment from currently selected packages
      for (const sp of selectedPackages) {
        const pkg = packages.find(p => p.id === sp.id)
        if (!pkg || !Array.isArray(pkg.equipment_items)) continue
        for (const pei of pkg.equipment_items) {
          if (pei.id === eq.id) {
            booked += Number(pei.quantity || 1) * (sp.quantity || 1)
          }
        }
      }

      // Subtract equipment manually selected in the form
      for (const se of selectedEquipment) {
        if (se.id === eq.id) booked += Number(se.quantity || 1)
      }
      
      map[eq.id] = Math.max(0, total - booked)
    }
    setAvailabilityMap(map)
  }

  // Compute immediate remaining availability for an equipment id (used in render to disable +)
  function immediateEquipmentRemaining(eqId: string) {
    const eq = equipment.find(e => e.id === eqId)
    if (!eq) return 0
    if (eq?.status && eq.status !== 'available') return 0
    const total = Number(eq.quantity ?? 1)

    let booked = 0
    const start = new Date(startTime || 0)
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + (durationMinutes || 60))
    for (const b of bookings) {
      if (!b.start_time || !b.end_time) continue
      const bStart = new Date(b.start_time)
      const bEnd = new Date(b.end_time)
      if (!(start < bEnd && bStart < end)) continue
      const items = b.equipment_items || []
      for (const bi of items) if (bi?.id === eqId) booked += Number(bi.quantity || 1)
    }
    // count equipment used by packages
    for (const sp of selectedPackages) {
      const pkg = packages.find(p => p.id === sp.id)
      if (!pkg || !Array.isArray(pkg.equipment_items)) continue
      const pei = pkg.equipment_items.find((it: any) => it.id === eqId)
      if (pei) booked += Number(pei.quantity || 1) * (sp.quantity || 0)
    }
    // other selected equipment
    for (const se of selectedEquipment) if (se.id === eqId) booked += Number(se.quantity || 0)

    return Math.max(0, total - booked)
  }

  // Lock to avoid duplicate rapid events (touch + click) for same item
  const actionLockRef = React.useRef<Record<string, number>>({})
  function tryPerformAction(key: string, fn: () => void, timeout = 350) {
    const now = Date.now()
    const last = actionLockRef.current[key] || 0
    if (now - last < timeout) return
    actionLockRef.current[key] = now
    try {
      fn()
    } finally {
      // release after timeout
      setTimeout(() => { actionLockRef.current[key] = 0 }, timeout)
    }
  }

  // When detail start/end change, clamp selected equipment quantities to available
  useEffect(() => {
    if (!selectedBooking) return
    let changed = false
    const clamped = detailSelectedEquipment.map(d => {
      const avail = computeAvailabilityForDetails(d.id)
      const qty = Math.min(Number(d.quantity || 0), avail)
      if (qty !== d.quantity) changed = true
      return { ...d, quantity: qty }
    }).filter(d => (d.quantity || 0) > 0)
    if (changed) setDetailSelectedEquipment(clamped)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailStartTime, detailEndTime, bookings, equipment])

  function resetForm() {
    setSelectedEquipment([])
    setSelectedPackages([])
    setCustomerName('')
    setCustomerPhone('')
    setStartTime('')
    setDurationMinutes(60)
    setDurationInput('60')
    setComputedPrice(null)
    setCustomPrice(null)
    setPriceInput('')
    setIsPriceManual(false)
    setNewPaid(false)
    setNewInvoiced(false)
    setNewInvoiceNumber(null)
    setNewNotes('')
  }

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    resetForm()
  }, [])

  // Atomically change equipment quantity using functional update to avoid races on mobile rapid taps
  function performEquipmentDelta(equipId: string, delta: number) {
    setSelectedEquipment(prev => {
      const eq = equipment.find(e => e.id === equipId)
      const total = Number(eq?.quantity ?? 1)

      // Compute booked from bookings
      let booked = 0
      const start = new Date(startTime || 0)
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + (durationMinutes || 60))
      for (const b of bookings) {
        if (!b.start_time || !b.end_time) continue
        const bStart = new Date(b.start_time)
        const bEnd = new Date(b.end_time)
        if (!(start < bEnd && bStart < end)) continue
        const items = b.equipment_items || []
        for (const bi of items) if (bi?.id === equipId) booked += Number(bi.quantity || 1)
      }

      // equipment used by packages
      let bookedByPackages = 0
      for (const sp of selectedPackages) {
        const pkg = packages.find(p => p.id === sp.id)
        if (!pkg || !Array.isArray(pkg.equipment_items)) continue
        const pei = pkg.equipment_items.find((it: any) => it.id === equipId)
        if (pei) bookedByPackages += Number(pei.quantity || 1) * (sp.quantity || 0)
      }
      booked += bookedByPackages

      // find current in previous state
      const current = prev.find(e => e.id === equipId)
      const currentQty = current?.quantity || 0

      // booked by other selected equipment (excluding current)
      let bookedByOtherSelected = 0
      for (const se of prev) if (se.id === equipId && se !== current) bookedByOtherSelected += Number(se.quantity || 0)
      booked += bookedByOtherSelected

      const remaining = Math.max(0, total - booked)
      const targetQty = Math.max(0, Math.min(currentQty + delta, currentQty + remaining))

      if (targetQty <= 0) return prev.filter(e => e.id !== equipId)

      if (current) return prev.map(e => e.id === equipId ? {...e, quantity: targetQty} : e)
      return [...prev, { id: equipId, quantity: targetQty }]
    })
  }

  function handleEquipmentChange(equipId: string, quantity: number) {
    // Legacy direct set (kept for non-incremental calls) -> convert to delta
    const current = selectedEquipment.find(e => e.id === equipId)
    const currentQty = current?.quantity || 0
    const delta = quantity - currentQty
    performEquipmentDelta(equipId, delta)
  }

  // Atomically change package quantity using functional update to avoid races
  function performPackageDelta(pkgId: string, delta: number) {
    setSelectedPackages(prev => {
      const sel = prev.find(p => p.id === pkgId)
      const currentQty = sel?.quantity || 0
      const addable = getMaxPackageQuantity(pkgId)
      const maxTotal = currentQty + addable
      const target = Math.max(0, Math.min(currentQty + delta, maxTotal))
      if (target <= 0) return prev.filter(p => p.id !== pkgId)
      if (sel) return prev.map(p => p.id === pkgId ? { ...p, quantity: target } : p)
      return [...prev, { id: pkgId, quantity: target }]
    })
  }

  function handlePackageChange(pkgId: string, quantity: number) {
    const sel = selectedPackages.find(p => p.id === pkgId)
    const currentQty = sel?.quantity || 0
    const delta = quantity - currentQty
    performPackageDelta(pkgId, delta)
  }

  // Compute max quantity for a package based on equipment availability
  function getMaxPackageQuantity(pkgId: string): number {
    // Backwards-compatible: return total allowed packages (not addable)
    const pkg = packages.find(p => p.id === pkgId)
    if (!pkg || !Array.isArray(pkg.equipment_items) || pkg.equipment_items.length === 0) {
      return 999 // no equipment constraints
    }

    // Helper to compute immediate availability for an equipment id (considers bookings and current selections)
    function immediateAvailable(eqId: string) {
      const eq = equipment.find(e => e.id === eqId)
      if (!eq) return 0
      if (eq?.status && eq.status !== 'available') return 0
      const total = Number(eq.quantity ?? 1)

      // booked by existing bookings (overlapping)
      let booked = 0
      const start = new Date(startTime || 0)
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + (durationMinutes || 60))
      for (const b of bookings) {
        if (!b.start_time || !b.end_time) continue
        const bStart = new Date(b.start_time)
        const bEnd = new Date(b.end_time)
        if (!(start < bEnd && bStart < end)) continue
        const items = b.equipment_items || []
        for (const bi of items) if (bi?.id === eqId) booked += Number(bi.quantity || 1)
      }

      // subtract manually selected equipment
      for (const se of selectedEquipment) if (se.id === eqId) booked += Number(se.quantity || 0)

      // subtract equipment used by other selected packages (excluding this package)
      for (const sp of selectedPackages) {
        if (!sp) continue
        if (sp.id === pkgId) continue
        const otherPkg = packages.find(p => p.id === sp.id)
        if (!otherPkg || !Array.isArray(otherPkg.equipment_items)) continue
        const otherPei = otherPkg.equipment_items.find((item: any) => item.id === eqId)
        if (otherPei) booked += Number(otherPei.quantity || 1) * (sp.quantity || 0)
      }

      return Math.max(0, total - booked)
    }

    let minAvailable = Infinity
    for (const pei of pkg.equipment_items) {
      const eqId = pei.id
      const qtyInPkg = Number(pei.quantity || 1)
      if (qtyInPkg <= 0) continue

      const avail = immediateAvailable(eqId)
      const maxPackagesForThisEquip = Math.floor(avail / qtyInPkg)
      minAvailable = Math.min(minAvailable, maxPackagesForThisEquip)
    }

    return Math.max(0, minAvailable === Infinity ? 999 : minAvailable)
  }

  // Return how many additional packages can be added (beyond current selection)
  function getMaxPackageAddable(pkgId: string) {
    const totalAllowed = getMaxPackageQuantity(pkgId)
    const current = selectedPackages.find(sp => sp.id === pkgId)
    const currentQty = current?.quantity || 0
    return Math.max(0, totalAllowed - currentQty)
  }

  async function computePricePreview() {
    // compute price locally
    let total = 0
    let hasItems = false

    // packages
    for (const item of selectedPackages) {
      const pkg = packages.find(p => p.id === item.id)
      if (pkg) {
        total += (Number(pkg.price) || 0) * (item.quantity || 1)
        hasItems = true
      }
    }

    // equipment
    const hours = Math.max(0.01, durationMinutes / 60)
    for (const item of selectedEquipment) {
      const eq = equipment.find(e => e.id === item.id)
      const rate = eq?.price_per_hour ? Number(eq.price_per_hour) : 0
      total += rate * (item.quantity || 1) * hours
      hasItems = true
    }
    
    if (!hasItems) {
      setComputedPrice(null)
      // Only reset manual price if not manually set? No, clear logic usually reset.
      // But if user set manual price, maybe they want to keep it? 
      // Let's mimic original: setComputedPrice(null)
    } else {
      setComputedPrice(Math.round((total + Number.EPSILON) * 100) / 100)
    }
  }

  async function createBooking() {
    if (!startTime) return alert('Seleziona data e ora')
    if (selectedEquipment.length === 0 && selectedPackages.length === 0) return alert('Seleziona almeno un\'attrezzatura o un pacchetto')

    let duration = durationMinutes || 60 // minutes
    // Use manual price if set, otherwise computed
    let price = isPriceManual && customPrice !== null ? customPrice : (computedPrice || 0)

    const end_time = new Date(startTime)
    end_time.setMinutes(end_time.getMinutes() + duration)

    // Merge package equipment_items (if any) with explicitly selected equipment FOR AVAILABILITY CHECK
    let mergedEquipment: {id: string, quantity: number}[] = [...selectedEquipment]
    
    for (const pkgItem of selectedPackages) {
      const pkg = packages.find(p => p.id === pkgItem.id)
      if (pkg && Array.isArray(pkg.equipment_items)) {
        // for each equipment in this package, multiply by package quantity
        for (const pei of pkg.equipment_items) {
          const mult = Number(pkgItem.quantity || 1)
          const qtyInPkg = Number(pei.quantity || 1)
          const totalToAdd = qtyInPkg * mult
          
          const existing = mergedEquipment.find(m => m.id === pei.id)
          if (existing) existing.quantity = (existing.quantity || 0) + totalToAdd
          else mergedEquipment.push({ id: pei.id, quantity: totalToAdd })
        }
      }
    }

    // Try to match customer in anagrafica
    let customerId: string | null = null
    let shouldAskToAddCustomer = false
    
    if (customerPhone.trim()) {
      // Search for existing customer by phone
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, name, phone')
        .ilike('phone', `%${customerPhone.trim()}%`)
        .limit(1)
      
      if (existingCustomers && existingCustomers.length > 0) {
        customerId = existingCustomers[0].id
      } else if (customerName.trim()) {
        // Customer not found - BLOCCO e chiedo conferma PRIMA di salvare
        setPendingBookingData({
          customer_name: customerName,
          customer_phone: customerPhone.trim(),
          start_time: new Date(startTime).toISOString(),
          end_time: end_time.toISOString(),
          price,
          package_id: null, // Multiple packages not supported by single FK, storing null
          equipment_items: selectedEquipment, // Store only manual equipment, not merged
          package_items: selectedPackages,
          mergedEquipment, // per availability check
          duration
        })
        setPendingCustomerData({ name: customerName.trim(), phone: customerPhone.trim() })
        setShowAddCustomerModal(true)
        return // BLOCCO qui, non salvo ancora
      }
    }

    // Se arrivo qui, procedo direttamente a salvare (cliente già in anagrafica o no telefono)
    await completeSaveBooking({
      customer_name: customerName,
      customer_phone: customerPhone.trim() || null,
      customer_id: customerId,
      start_time: new Date(startTime).toISOString(),
      end_time: end_time.toISOString(),
      price,
      package_id: null,
      equipment_items: selectedEquipment, // Store only manual equipment, not merged
      package_items: selectedPackages,
      mergedEquipment,
      duration
    })
  }

  async function completeSaveBooking(bookingData: any) {
    const { mergedEquipment, duration, customer_id, ...dbData } = bookingData
    const end_time = new Date(bookingData.start_time)
    end_time.setMinutes(end_time.getMinutes() + (duration || durationMinutes))

    // --- Availability check: ensure requested quantities do not exceed available inventory ---
    function timesOverlap(aStart: string | Date, aEnd: string | Date, bStart: string | Date, bEnd: string | Date) {
      const Astart = new Date(aStart)
      const Aend = new Date(aEnd)
      const Bstart = new Date(bStart)
      const Bend = new Date(bEnd)
      return Astart < Bend && Bstart < Aend
    }

    // check availability for merged items (package + manual selection)
    const itemsToCheck = mergedEquipment || []

    for (const item of itemsToCheck) {
      const eq = equipment.find(e => e.id === item.id)
      // block if equipment status is not available
      if (eq?.status && eq.status !== 'available') return alert(`Attenzione: ${eq?.name || 'attrezzatura'} non è disponibile per le prenotazioni (status: ${eq.status}).`)

      const totalQty = eq?.quantity != null ? Number(eq.quantity) : 1
      let bookedQty = 0

      for (const b of bookings) {
        if (!b.start_time || !b.end_time) continue
        if (!timesOverlap(bookingData.start_time, end_time.toISOString(), b.start_time, b.end_time)) continue
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
        p_customer_name: dbData.customer_name,
        p_start: dbData.start_time,
        p_end: dbData.end_time,
        p_price: dbData.price,
        p_package: dbData.package_id,
        p_equipment_items: dbData.equipment_items,
        p_package_items: dbData.package_items || []
      })
      if (error) throw error
      // RPC returns the created booking id (table result). Update with customer_phone, customer_id, paid/invoiced if user set them
      const createdId = Array.isArray(data) ? data[0]?.id : (data?.id ?? null)
      if (createdId) {
        const payload: any = {}
        if (dbData.customer_phone) payload.customer_phone = dbData.customer_phone
        if (customer_id) payload.customer_id = customer_id
        if (newPaid) {
          payload.paid = true
          payload.paid_at = new Date().toISOString()
        }
        if (newInvoiced !== undefined) payload.invoiced = newInvoiced
        if (newInvoiceNumber) payload.invoice_number = newInvoiceNumber
        if (newNotes) payload.notes = newNotes
        
        if (Object.keys(payload).length > 0) {
          const { error: upErr } = await supabase.from('booking').update(payload).eq('id', createdId)
          if (upErr) throw upErr
        }
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
    load()
  }

  async function addCustomerToAnagrafica() {
    if (!pendingCustomerData) return
    
    try {
      const { data, error } = await supabase.from('customers').insert({
        name: pendingCustomerData.name,
        phone: pendingCustomerData.phone
      }).select()
      
      if (error) throw error
      
      const newCustomerId = data?.[0]?.id || null
      
      // Se c'è una prenotazione in attesa, completa il salvataggio con il nuovo customer_id
      if (pendingBookingData) {
        await completeSaveBooking({
          ...pendingBookingData,
          customer_id: newCustomerId
        })
        setPendingBookingData(null)
      }
      
      load() // ricarica anche la lista customers
    } catch (err: any) {
      alert('Errore durante l\'aggiunta del cliente: ' + (err?.message || String(err)))
    }
    
    setShowAddCustomerModal(false)
    setPendingCustomerData(null)
  }

  async function skipAddCustomerToAnagrafica() {
    // Salva prenotazione senza aggiungere cliente in anagrafica
    if (pendingBookingData) {
      await completeSaveBooking(pendingBookingData)
      setPendingBookingData(null)
    }
    setShowAddCustomerModal(false)
    setPendingCustomerData(null)
  }

  async function removeBooking(id: string) {
    const { error } = await supabase.from('booking').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function saveBookingChanges(updated: any) {
    const { id, customer_name, customer_phone, start_time, end_time, price, package_id, equipment_items, package_items, paid, invoiced, invoice_number, notes } = updated
    const updatePayload: any = { customer_name, customer_phone, start_time, end_time, price, package_id, equipment_items, package_items, notes }
    if (paid !== undefined) updatePayload.paid = paid
    if (invoiced !== undefined) updatePayload.invoiced = invoiced
    if (invoice_number !== undefined) updatePayload.invoice_number = invoice_number

    const { error } = await supabase.from('booking').update(updatePayload).eq('id', id)
    if (error) return alert(error.message)

    // Optimistically update local bookings state so reopening the modal shows the latest values immediately
    setBookings(prev => (prev || []).map(b => (b.id === id ? { ...b, ...updatePayload } : b)))

    // Invalidate cached day bookings for the booking's date so any cached day view is refreshed on next load
    try {
      if (start_time) {
        const key = dateKey(new Date(start_time))
        setDayBookingsCache(prev => ({ ...prev, [key]: undefined }))
      }
    } catch (e) {
      // ignore
    }

    // Refresh in background to ensure server state is synced
    load({ background: true })
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

  function dateKey(date: Date) {
    return date.toISOString().slice(0,10)
  }

  async function fetchBookingsForDate(date: Date) {
    const key = dateKey(date)
    // If cached, reuse
    if (dayBookingsCache[key]) return dayBookingsCache[key]
    try {
      setDayLoading(prev => ({...prev, [key]: true}))
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      const { data } = await supabase.from('booking').select('*').gte('start_time', dayStart.toISOString()).lt('start_time', dayEnd.toISOString()).order('start_time', { ascending: true })
      setDayBookingsCache(prev => ({ ...prev, [key]: data || [] }))
      return data || []
    } catch (err) {
      console.error('Errore caricamento prenotazioni per giorno:', err)
      setDayBookingsCache(prev => ({ ...prev, [key]: [] }))
      return []
    } finally {
      setDayLoading(prev => ({...prev, [key]: false}))
    }
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
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  function getDateRangeLabel() {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    } else {
      return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-4">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <PageTitle className="m-0">Prenotazioni</PageTitle>
          <Button onClick={() => setShowModal(true)}>+ Nuova Prenotazione</Button>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Gestisci le prenotazioni della tua attrezzatura</p>
      </div>

      {/* View controls */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate('prev')} className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-sm font-medium min-w-[120px] sm:min-w-[200px] text-center">
            <div>{getDateRangeLabel()}</div>
          </div>
          <button onClick={() => navigateDate('next')} className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="ml-2 px-3 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Oggi
          </button>
        </div>

        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded p-1 mt-2 self-start">
          <button onClick={() => setViewMode('day')} aria-pressed={viewMode === 'day'} className={`w-20 text-center px-3 py-1 text-sm rounded ${viewMode === 'day' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Giorno</button>
          <button onClick={() => setViewMode('month')} aria-pressed={viewMode === 'month'} className={`w-20 text-center px-3 py-1 text-sm rounded ${viewMode === 'month' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Mese</button>
        </div>
      </div>

      {/* Calendar view */}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
        {viewMode === 'day' && (
          <div className="p-4">
              <div className="space-y-1">
              {renderDayList()}
            </div>
          </div>
        )}



        {viewMode === 'month' && (
          <>
            {/* Desktop / Tablet grid */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-7 auto-rows-[minmax(160px,auto)] lg:auto-rows-[minmax(180px,auto)] xl:auto-rows-[minmax(220px,auto)]">
                {getMonthDays(currentDate).map((day, i) => {
                  const dayBookings = getBookingsForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  return (
                    <div key={i} onClick={() => openDayListModal(day)} tabIndex={0} onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDayListModal(day) } }} role="button" className={`p-2 border-r border-b border-neutral-200 dark:border-neutral-700 min-h-[100px] ${isToday ? 'bg-amber-50 dark:bg-amber-900/10' : ''} ${!isCurrentMonth ? 'opacity-30' : ''}`}>
                      <div className={`text-sm mb-1 ${isToday ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{day.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                        <div className="font-medium">{day.getDate()}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {/* Render compact dots (up to 6) with tooltip; show +N if more */}
                        {dayBookings.slice(0, 6).map(b => (
                          <button key={b.id} title={bookingTitle(b)} onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); setShowBookingDetails(true) }} className="inline-flex items-center gap-2 px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs truncate">
                            {compactDot(b)}
                            <div className="flex flex-col truncate max-w-[120px]">
                              <span className="truncate font-medium">{b.customer_name || 'Cliente'}</span>
                              <span className="text-xs text-neutral-500">{new Date(b.start_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})} — {new Date(b.end_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                          </button>
                        ))}
                        {dayBookings.length > 6 && (
                          <button onClick={(e)=>{ e.stopPropagation(); openDayListModal(day) }} className="text-xs text-neutral-500 hover:underline">+{dayBookings.length - 6}</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile grid - simplified: only day and count (larger) */}
            <div className="sm:hidden p-3">
              <div className="grid grid-cols-7 gap-2 auto-rows-[minmax(96px,auto)]">
                {getMonthDays(currentDate).map((day) => {
                  const dayBookings = getBookingsForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  return (
                    <button
                      key={day.toDateString()}
                      onClick={() => { setPressedDay(day.toDateString()); window.setTimeout(()=>{ setPressedDay(null); openDayListModal(day) }, 120) }}
                      aria-label={`Apri prenotazioni ${day.toLocaleDateString('it-IT')}`}
                      className={`p-3 rounded border text-center text-sm ${pressedDay === day.toDateString() ? 'scale-95 transform transition-transform duration-100' : ''} ${isToday ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200' : 'border-neutral-200 dark:border-neutral-700'} ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                      <div className="text-xs text-neutral-500 mb-0.5">{day.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                      <div className="font-medium">{day.getDate()}</div>
                      <div className={`text-lg font-semibold ${dayBookings.length === 0 ? 'text-neutral-500' : dayBookings.every(b => b.paid) ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} title={dayBookings.length === 0 ? 'Nessuna prenotazione' : dayBookings.every(b => b.paid) ? 'Tutte pagate' : 'Ci sono prenotazioni non pagate'}>{dayBookings.length}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* New booking modal */}
      <Modal fullScreenMobile openFullMobile isOpen={showModal} onClose={handleCloseModal} title="Nuova Prenotazione">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <div className="relative">
              <input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  setCustomerSearchQuery(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Nome cliente (inizia a digitare per cercare in anagrafica)"
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {showCustomerDropdown && customerSearchQuery && (
                <div onClick={(e) => e.stopPropagation()} className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-neutral-600 rounded shadow-lg max-h-48 overflow-y-auto">
                  {customers.filter(c => 
                    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.phone?.toLowerCase().includes(customerSearchQuery.toLowerCase())
                  ).slice(0, 5).map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setCustomerName(customer.name)
                        setCustomerPhone(customer.phone || '')
                        setShowCustomerDropdown(false)
                        setCustomerSearchQuery('')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        {customer.phone && <div className="text-xs text-neutral-500">{customer.phone}</div>}
                      </div>
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ))}
                  {customers.filter(c => 
                    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.phone?.toLowerCase().includes(customerSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-neutral-500">Nessun cliente trovato in anagrafica</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telefono</label>
            <div className="relative">
              <input
                type="tel"
                inputMode="tel"
                pattern="[0-9+\s()-]*"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+39 123 456 7890"
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {formatPhoneForWhatsApp(customerPhone) && (
                <a
                  href={`https://wa.me/${formatPhoneForWhatsApp(customerPhone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Apri chat WhatsApp"
                  className="absolute right-2 top-2 inline-flex items-center justify-center"
                >
                  <svg className="w-5 h-5" viewBox="0 0 175.216 175.552" aria-hidden="true">
                    <circle fill="#25D366" cx="87.608" cy="87.776" r="87.608"/>
                    <path fill="#FFFFFF" d="M126.88 48.572c-9.304-9.304-21.664-14.432-34.848-14.432-27.136 0-49.216 22.08-49.216 49.216 0 8.672 2.272 17.152 6.56 24.608l-6.976 25.472 26.048-6.816c7.232 3.936 15.36 6.016 23.584 6.016h.032c27.136 0 49.216-22.08 49.216-49.216 0-13.152-5.12-25.504-14.4-34.848zm-34.848 75.776h-.032c-7.328 0-14.528-1.952-20.8-5.632l-1.504-.896-15.488 4.064 4.128-15.104-.992-1.568c-4.032-6.4-6.176-13.792-6.176-21.408 0-22.176 18.048-40.224 40.256-40.224 10.752 0 20.864 4.192 28.448 11.808 7.584 7.584 11.776 17.664 11.776 28.416-.032 22.208-18.08 40.256-40.256 40.256zm22.08-30.144c-1.216-.608-7.136-3.52-8.224-3.904-1.088-.416-1.888-.608-2.688.608-.8 1.216-3.104 3.904-3.808 4.704-.704.8-1.408 .928-2.624.32-1.216-.608-5.12-1.888-9.76-6.016-3.616-3.2-6.048-7.168-6.752-8.384-.704-1.216-.064-1.888.544-2.496.544-.544 1.216-1.408 1.824-2.112.608-.704.8-1.216 1.216-2.016.416-.8.192-1.504-.096-2.112-.32-.608-2.688-6.464-3.68-8.864-.96-2.304-1.984-2.016-2.688-2.048-.704-.032-1.504-.032-2.304-.032s-2.112.32-3.2 1.504c-1.088 1.216-4.16 4.064-4.16 9.92s4.256 11.52 4.864 12.32c.608.8 8.672 13.216 21.024 18.528 2.944 1.28 5.248 2.048 7.04 2.624 2.944.96 5.632.832 7.744.512 2.368-.352 7.136-2.912 8.128-5.728.992-2.816.992-5.248.672-5.76-.288-.544-1.088-.864-2.304-1.472z"/>
                  </svg>
                </a>
              )}
            </div>
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
            <label className="block text-sm font-medium mb-2">Pacchetti (opzionale)</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-3">
              {packages.map(p => {
                const sel = selectedPackages.find(sp => sp.id === p.id)
                const qty = sel?.quantity || 0
                const maxQty = getMaxPackageQuantity(p.id)
                const canAdd = maxQty > qty
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-neutral-400">€ {p.price} — <span className="text-neutral-500">Max: {maxQty}</span></div>
                    </div>
                     <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onPointerDown={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          if (qty <= 0) return;
                          tryPerformAction(`pkg-${p.id}-dec`, () => performPackageDelta(p.id, -1)) 
                        }}
                        disabled={qty <= 0}
                        className={`w-8 h-8 rounded ${qty <= 0 ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm font-medium">{qty}</span>
                      <button
                        type="button"
                        onPointerDown={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          if (!canAdd) return;
                          tryPerformAction(`pkg-${p.id}-inc`, () => performPackageDelta(p.id, +1)) 
                        }}
                        disabled={!canAdd}
                        className={`w-8 h-8 rounded ${!canAdd ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
              {packages.length === 0 && <div className="text-sm text-neutral-500 text-center py-4">Nessun pacchetto disponibile</div>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Attrezzatura</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-3">
              {equipment.map((eq) => {
                const selected = selectedEquipment.find(e => e.id === eq.id)
                const isAvailable = !(eq?.status && eq.status !== 'available')
                // Use immediate calculation so button disabled updates instantly on touch
                const remaining = isAvailable ? immediateEquipmentRemaining(eq.id) : 0
                const displayedAvail = isAvailable ? remaining : 0
                const selectedQty = selected?.quantity || 0
                const disableInc = !isAvailable || displayedAvail <= 0
                return (
                  <div key={eq.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{eq.name}</div>
                        <div className={`inline-block px-2 py-0.5 text-xs rounded ${isAvailable ? 'bg-green-100 text-green-800' : eq.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{isAvailable ? 'Disponibile' : (eq.status === 'maintenance' ? 'Manutenzione' : 'Ritirata')}</div>
                      </div>
                      <div className="text-xs text-neutral-400">€ {eq.price_per_hour ?? 0} / ora — <span className="text-neutral-500">Disponibili: {displayedAvail}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onPointerDown={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          if (selectedQty <= 0 || !isAvailable) return;
                          tryPerformAction(`eq-${eq.id}-dec`, () => performEquipmentDelta(eq.id, -1)) 
                        }}
                        disabled={selectedQty <= 0 || !isAvailable}
                        aria-disabled={selectedQty <= 0 || !isAvailable}
                        className={`w-8 h-8 rounded ${ (!isAvailable || selectedQty <= 0) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm font-medium">{selectedQty}</span>
                      <button
                        type="button"
                        onPointerDown={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          if (disableInc) return;
                          tryPerformAction(`eq-${eq.id}-inc`, () => performEquipmentDelta(eq.id, +1)) 
                        }}
                        disabled={disableInc}
                        aria-disabled={disableInc}
                        className={`w-8 h-8 rounded ${ (disableInc) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
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
              <label className="block text-sm font-medium mb-1">Prezzo</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => {
                     setPriceInput(e.target.value)
                     const val = parseFloat(e.target.value)
                     if (!isNaN(val) && e.target.value.trim() !== '') {
                       setCustomPrice(val)
                       setIsPriceManual(true)
                     } else if (e.target.value.trim() === '') {
                       // Allow empty field during editing
                       setIsPriceManual(true)
                     }
                  }}
                  onBlur={() => {
                    // On blur, if empty or invalid, reset to computed price
                    const val = parseFloat(priceInput)
                    if (isNaN(val) || priceInput.trim() === '') {
                      if (computedPrice !== null) {
                        setPriceInput(String(computedPrice))
                        setCustomPrice(computedPrice)
                        setIsPriceManual(false)
                      } else {
                        setPriceInput('0')
                        setCustomPrice(0)
                      }
                    }
                  }}
                  className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xl font-bold">€</span>
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {isPriceManual ? 
                  <button type="button" onClick={()=>{ setIsPriceManual(false); setCustomPrice(null); setPriceInput(computedPrice !== null ? String(computedPrice) : '0') }} className="text-amber-600 hover:underline">Ripristina calcolo automatico</button> : 
                  "Calcolato automaticamente"}
              </div>
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

      {/* Preview popover for long-press / hover */}


      {/* Day bookings modal (all bookings for a selected date) */}
      <Modal mobileCentered autoFocus={false} isOpen={showDayListModal} onClose={() => { setShowDayListModal(false); setModalDay(null) }} title={modalDay ? `Prenotazioni ${modalDay.toLocaleDateString('it-IT')}` : 'Prenotazioni'}>
        {modalDay && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {getBookingsForDate(modalDay).length === 0 && <div className="text-neutral-500">Nessuna prenotazione</div>}
            {getBookingsForDate(modalDay).map(b => (
              <div key={b.id} role="button" tabIndex={0} onKeyDown={(e)=>{ if (e.key === 'Enter') { setSelectedBooking(b); setShowBookingDetails(true); setShowDayListModal(false) } }} onClick={() => { setSelectedBooking(b); setShowBookingDetails(true); setShowDayListModal(false) }} className={`p-3 rounded border ${statusClass(b)} bg-amber-50 dark:bg-neutral-800/50 relative overflow-hidden cursor-pointer`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{formatTimeRange(b)} <span className="ml-2 inline">{b.customer_name || 'Cliente'}</span></div>
                        {formatPhoneForWhatsApp(b.customer_phone) && (
                          <a
                            href={`https://wa.me/${formatPhoneForWhatsApp(b.customer_phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Apri chat WhatsApp"
                            className="inline-flex items-center justify-center"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 175.216 175.552" aria-hidden="true">
                              <circle fill="#25D366" cx="87.608" cy="87.776" r="87.608"/>
                              <path fill="#FFFFFF" d="M126.88 48.572c-9.304-9.304-21.664-14.432-34.848-14.432-27.136 0-49.216 22.08-49.216 49.216 0 8.672 2.272 17.152 6.56 24.608l-6.976 25.472 26.048-6.816c7.232 3.936 15.36 6.016 23.584 6.016h.032c27.136 0 49.216-22.08 49.216-49.216 0-13.152-5.12-25.504-14.4-34.848zm-34.848 75.776h-.032c-7.328 0-14.528-1.952-20.8-5.632l-1.504-.896-15.488 4.064 4.128-15.104-.992-1.568c-4.032-6.4-6.176-13.792-6.176-21.408 0-22.176 18.048-40.224 40.256-40.224 10.752 0 20.864 4.192 28.448 11.808 7.584 7.584 11.776 17.664 11.776 28.416-.032 22.208-18.08 40.256-40.256 40.256zm22.08-30.144c-1.216-.608-7.136-3.52-8.224-3.904-1.088-.416-1.888-.608-2.688.608-.8 1.216-3.104 3.904-3.808 4.704-.704.8-1.408 .928-2.624.32-1.216-.608-5.12-1.888-9.76-6.016-3.616-3.2-6.048-7.168-6.752-8.384-.704-1.216-.064-1.888.544-2.496.544-.544 1.216-1.408 1.824-2.112.608-.704.8-1.216 1.216-2.016.416-.8.192-1.504-.096-2.112-.32-.608-2.688-6.464-3.68-8.864-.96-2.304-1.984-2.016-2.688-2.048-.704-.032-1.504-.032-2.304-.032s-2.112.32-3.2 1.504c-1.088 1.216-4.16 4.064-4.16 9.92s4.256 11.52 4.864 12.32c.608.8 8.672 13.216 21.024 18.528 2.944 1.28 5.248 2.048 7.04 2.624 2.944.96 5.632.832 7.744.512 2.368-.352 7.136-2.912 8.128-5.728.992-2.816.992-5.248.672-5.76-.288-.544-1.088-.864-2.304-1.472z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{b.notes ? (b.notes.length > 150 ? b.notes.slice(0,150) + '…' : b.notes) : ''}</div>
                    <div className="mt-2 text-sm">
                      <div className="text-neutral-500">{equipmentLabel(b)}</div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {b.price && <div className="text-amber-500 dark:text-amber-300 font-bold text-lg whitespace-nowrap">€ {Number(b.price).toFixed(2)}</div>}
                    <div className="mt-0 w-full sm:w-auto flex flex-col items-end gap-2">
                      {!b.paid && (
                        <button onClick={(e)=>{ e.stopPropagation(); setMarkPaidBooking(b); setMarkPaidInvoiced(null); setMarkPaidInvoiceNumber(null); setShowMarkPaidModal(true) }} className="text-sm px-3 py-2 rounded bg-green-600 text-white w-full sm:w-auto">Segna come pagato</button>
                      )}
                      {b.paid && <div className="text-sm text-green-600 font-semibold">Pagato</div>}
                      {b.invoiced && <div className="text-sm text-blue-600 font-semibold">Fatturato</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Mark as paid confirmation modal */}
      <Modal mobileCentered isOpen={showMarkPaidModal} onClose={() => { setShowMarkPaidModal(false); setMarkPaidBooking(null); setMarkPaidInvoiced(null); setMarkPaidInvoiceNumber(null) }} title="Segna come pagato">
        {markPaidBooking && (
          <div className="space-y-4">
            <p>Hai emesso fattura per questa prenotazione?</p>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button onClick={() => setMarkPaidInvoiced('yes')} className={`w-full sm:w-auto px-3 py-1 text-sm rounded-md ${markPaidInvoiced === 'yes' ? 'bg-amber-600 text-white' : 'border'}`}>Sì</button>
              <button onClick={() => setMarkPaidInvoiced('no')} className={`w-full sm:w-auto px-3 py-1 text-sm rounded-md ${markPaidInvoiced === 'no' ? 'bg-amber-600 text-white' : 'border'}`}>No</button>
            </div>
            {markPaidInvoiced === 'yes' && (
              <div>
                <label className="block text-sm font-medium mb-1">Numero fattura (opzionale)</label>
                <input value={markPaidInvoiceNumber ?? ''} onChange={(e)=>setMarkPaidInvoiceNumber(e.target.value || null)} className="w-full border px-3 py-2 rounded" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => { setShowMarkPaidModal(false); setMarkPaidBooking(null); setMarkPaidInvoiced(null); setMarkPaidInvoiceNumber(null) }} className="px-3 py-1 rounded-md border">Annulla</button>
              <Button className="px-3 py-1" onClick={async () => {
                if (!markPaidBooking || markPaidInvoiced === null) return
                const id = markPaidBooking.id
                const paidAt = new Date().toISOString()
                const invoiced = markPaidInvoiced === 'yes'
                const payload: any = { paid: true, paid_at: paidAt, invoiced }
                if (invoiced && markPaidInvoiceNumber) payload.invoice_number = markPaidInvoiceNumber
                const { error } = await supabase.from('booking').update(payload).eq('id', id)
                if (error) return alert(error.message)
                setShowMarkPaidModal(false)
                setMarkPaidBooking(null)
                setMarkPaidInvoiced(null)
                setMarkPaidInvoiceNumber(null)
                load()
              }} disabled={markPaidInvoiced === null}>Conferma</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal fullScreenMobile openFullMobile isOpen={showBookingDetails} onClose={() => { setShowBookingDetails(false); setSelectedBooking(null) }} title="Dettaglio Prenotazione" autoFocus={false}>
        {selectedBooking && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cliente</label>
              <input value={detailCustomerName} onChange={(e)=>setDetailCustomerName(e.target.value)} className="w-full border px-3 py-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Telefono</label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="tel"
                  pattern="[0-9+\s()-]*"
                  value={detailCustomerPhone}
                  onChange={(e)=>setDetailCustomerPhone(e.target.value)}
                  placeholder="+39 123 456 7890"
                  className="w-full border px-3 py-2 rounded"
                />
                {formatPhoneForWhatsApp(detailCustomerPhone) && (
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsApp(detailCustomerPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Apri chat WhatsApp"
                    className="absolute right-2 top-2 inline-flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 175.216 175.552" aria-hidden="true">
                      <circle fill="#25D366" cx="87.608" cy="87.776" r="87.608"/>
                      <path fill="#FFFFFF" d="M126.88 48.572c-9.304-9.304-21.664-14.432-34.848-14.432-27.136 0-49.216 22.08-49.216 49.216 0 8.672 2.272 17.152 6.56 24.608l-6.976 25.472 26.048-6.816c7.232 3.936 15.36 6.016 23.584 6.016h.032c27.136 0 49.216-22.08 49.216-49.216 0-13.152-5.12-25.504-14.4-34.848zm-34.848 75.776h-.032c-7.328 0-14.528-1.952-20.8-5.632l-1.504-.896-15.488 4.064 4.128-15.104-.992-1.568c-4.032-6.4-6.176-13.792-6.176-21.408 0-22.176 18.048-40.224 40.256-40.224 10.752 0 20.864 4.192 28.448 11.808 7.584 7.584 11.776 17.664 11.776 28.416-.032 22.208-18.08 40.256-40.256 40.256zm22.08-30.144c-1.216-.608-7.136-3.52-8.224-3.904-1.088-.416-1.888-.608-2.688.608-.8 1.216-3.104 3.904-3.808 4.704-.704.8-1.408 .928-2.624.32-1.216-.608-5.12-1.888-9.76-6.016-3.616-3.2-6.048-7.168-6.752-8.384-.704-1.216-.064-1.888.544-2.496.544-.544 1.216-1.408 1.824-2.112.608-.704.8-1.216 1.216-2.016.416-.8.192-1.504-.096-2.112-.32-.608-2.688-6.464-3.68-8.864-.96-2.304-1.984-2.016-2.688-2.048-.704-.032-1.504-.032-2.304-.032s-2.112.32-3.2 1.504c-1.088 1.216-4.16 4.064-4.16 9.92s4.256 11.52 4.864 12.32c.608.8 8.672 13.216 21.024 18.528 2.944 1.28 5.248 2.048 7.04 2.624 2.944.96 5.632.832 7.744.512 2.368-.352 7.136-2.912 8.128-5.728.992-2.816.992-5.248.672-5.76-.288-.544-1.088-.864-2.304-1.472z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pacchetti (opzionale)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-3">
                {packages.map(p => {
                  const sel = detailSelectedPackages.find(sp => sp.id === p.id)
                  const qty = sel?.quantity || 0
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-neutral-400">€ {p.price}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={(e)=>{ e.stopPropagation(); handleDetailPackageChange(p.id, qty - 1) }} className={`w-6 h-6 rounded ${qty <= 0 ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}>-</button>
                        <span className="w-8 text-center text-sm font-medium">{qty}</span>
                        <button type="button" onClick={(e)=>{ e.stopPropagation(); handleDetailPackageChange(p.id, qty + 1) }} disabled={getMaxPackageAddable(p.id) <= 0} className={`w-6 h-6 rounded ${(getMaxPackageAddable(p.id) <= 0) ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}>+</button>
                      </div>
                    </div>
                  )
                })}
                {packages.length === 0 && <div className="text-sm text-neutral-500 text-center py-4">Nessun pacchetto disponibile</div>}
              </div>
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
                <input type="number" step="0.01" value={detailPrice ?? ''} onChange={(e)=>{ setDetailPrice(e.target.value === '' ? null : Number(e.target.value)); setDetailPriceManual(true); }} className="w-full border px-3 py-2 rounded" />
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
                  customer_phone: detailCustomerPhone,
                  start_time: start_iso,
                  end_time: end_iso,
                  price: detailPrice,
                  package_id: detailSelectedPackage,
                  equipment_items: detailSelectedEquipment,
                  package_items: detailSelectedPackages,
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

      {/* Modal for suggesting adding customer to anagrafica */}
      <Modal isOpen={showAddCustomerModal} onClose={() => { skipAddCustomerToAnagrafica() }} title="Aggiungi cliente all'anagrafica?">
        {pendingCustomerData && (
          <div className="space-y-4">
            <p className="text-neutral-700 dark:text-neutral-300">
              Il cliente <strong>{pendingCustomerData.name}</strong> con telefono <strong>{pendingCustomerData.phone}</strong> non è presente nell'anagrafica.
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Vuoi aggiungerlo ora per poterlo richiamare velocemente nelle prossime prenotazioni?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={skipAddCustomerToAnagrafica} className="px-4 py-2 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                No
              </button>
              <button onClick={addCustomerToAnagrafica} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded">
                Sì, aggiungi
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
