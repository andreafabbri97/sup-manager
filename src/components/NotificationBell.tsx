import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Card from './ui/Card'
import Modal from './ui/Modal'

type Notification = {
  id: string
  type: 'payment' | 'booking' | 'maintenance'
  message: string
  priority: 'high' | 'medium' | 'low'
  date?: string | Date
  relatedId?: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState<string[]>(() => JSON.parse(localStorage.getItem('notifs:read') || '[]'))
  const [selected, setSelected] = useState<Notification | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const mq = window.matchMedia('(max-width: 767.98px)')
      return mq.matches || Boolean(navigator?.maxTouchPoints) || ('ontouchstart' in window)
    } catch { return window.innerWidth < 768 }
  })

  useEffect(() => {
    loadNotifications()
    // Ricarica ogni 5 minuti
    const interval = setInterval(loadNotifications, 300000)
    const onResize = () => {
      try {
        const mq = window.matchMedia('(max-width: 767.98px)')
        setIsMobile(mq.matches || Boolean(navigator?.maxTouchPoints) || ('ontouchstart' in window))
      } catch {
        setIsMobile(window.innerWidth < 768)
      }
    }
    window.addEventListener('resize', onResize)
    // initial set
    onResize()
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // --- Details components ---
  function BookingDetails() {
    const [items, setItems] = useState<any[] | null>(null)
    useEffect(() => {
      let cancelled = false
      async function load() {
        const today = new Date()
        today.setHours(0,0,0,0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const { data } = await supabase.from('booking').select('*').gte('start_time', today.toISOString()).lt('start_time', tomorrow.toISOString())
        if (cancelled) return
        setItems(data || [])
      }
      load()
      return () => { cancelled = true }
    }, [])
    if (!items) return <div>Caricamento dettagli...</div>
    if (items.length === 0) return <div>Nessuna prenotazione trovata per oggi.</div>
    return (
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="p-2 border rounded">
            <div className="font-medium">{it.customer_name || 'Cliente'}</div>
            <div className="text-xs text-neutral-500">{new Date(it.start_time).toLocaleString('it-IT')} — {it.invoice_number ? `#${it.invoice_number}` : ''}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(it.id); alert('ID prenotazione copiato') }} className="px-2 py-1 rounded border text-sm">Copia ID</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function PaymentDetails() {
    const [items, setItems] = useState<any[] | null>(null)
    useEffect(() => {
      let cancelled = false
      async function load() {
        const { data } = await supabase.from('booking').select('*').eq('paid', false).gte('start_time', new Date(Date.now() - 7*24*60*60*1000).toISOString())
        if (cancelled) return
        setItems(data || [])
      }
      load()
      return () => { cancelled = true }
    }, [])
    if (!items) return <div>Caricamento dettagli...</div>
    if (items.length === 0) return <div>Nessun pagamento in sospeso.</div>
    return (
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="p-2 border rounded">
            <div className="font-medium">{it.customer_name || 'Cliente'}</div>
            <div className="text-xs text-neutral-500">€ {Number(it.price || 0).toFixed(2)} — {new Date(it.start_time).toLocaleDateString('it-IT')}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={async ()=>{ const { error } = await supabase.from('booking').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', it.id); if (error) alert(error.message); else { alert('Segnata come pagata'); loadNotifications() } }} className="px-2 py-1 rounded border text-sm">Segna pagata</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function MaintenanceDetails() {
    const [items, setItems] = useState<any[] | null>(null)
    useEffect(() => {
      let cancelled = false
      async function load() {
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        const { data } = await supabase.from('equipment').select('*').not('next_maintenance','is',null).lte('next_maintenance', nextWeek.toISOString())
        if (cancelled) return
        setItems(data || [])
      }
      load()
      return () => { cancelled = true }
    }, [])
    if (!items) return <div>Caricamento dettagli...</div>
    if (items.length === 0) return <div>Nessuna attrezzatura da manutenere.</div>
    return (
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="p-2 border rounded">
            <div className="font-medium">{it.name}</div>
            <div className="text-xs text-neutral-500">Prossima manutenzione: {it.next_maintenance ? new Date(it.next_maintenance).toLocaleDateString('it-IT') : '—'}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={async ()=>{ const { error } = await supabase.from('equipment').update({ next_maintenance: null }).eq('id', it.id); if (error) alert(error.message); else { alert('Segnata manutenzione come completata'); loadNotifications() } }} className="px-2 py-1 rounded border text-sm">Segna completata</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  async function loadNotifications() {
    setLoading(true)
    const notifs: Notification[] = []

    try {
      // 1. Prenotazioni in scadenza oggi
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: todayBookings } = await supabase
        .from('booking')
        .select('id, customer_name, start_time')
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())

      if (todayBookings && todayBookings.length > 0) {
        notifs.push({
          id: 'bookings-today',
          type: 'booking',
          message: `${todayBookings.length} prenotazione${todayBookings.length > 1 ? 'i' : ''} oggi`,
          priority: 'high',
          relatedId: todayBookings[0]?.id,
          date: today.toISOString()
        })
      }

      // 2. Pagamenti in sospeso
      const { data: unpaidBookings } = await supabase
        .from('booking')
        .select('id, customer_name, price, start_time')
        .eq('paid', false)
        .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // ultimi 7 giorni

      if (unpaidBookings && unpaidBookings.length > 0) {
        const total = unpaidBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0)
        notifs.push({
          id: 'unpaid-bookings',
          type: 'payment',
          message: `${unpaidBookings.length} pagamento${unpaidBookings.length > 1 ? 'i' : ''} in sospeso (€${total.toFixed(2)})`,
          priority: 'medium',
          relatedId: unpaidBookings[0]?.id,
          date: unpaidBookings[0]?.start_time
        })
      }

      // 3. Manutenzione attrezzatura
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const { data: maintenanceDue } = await supabase
        .from('equipment')
        .select('id, name, next_maintenance')
        .not('next_maintenance', 'is', null)
        .lte('next_maintenance', nextWeek.toISOString())

      if (maintenanceDue && maintenanceDue.length > 0) {
        notifs.push({
          id: 'maintenance-due',
          type: 'maintenance',
          message: `${maintenanceDue.length} attrezzatura${maintenanceDue.length > 1 ? 'e' : ''} necessita manutenzione`,
          priority: 'medium',
        })
      }

      setNotifications(notifs)
    } catch (error) {
      console.error('Errore caricamento notifiche:', error)
    }
    setLoading(false)
  }

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length
  
  // notification list items (core content without wrapper)
  const notificationItems = (
    <div className="overflow-y-auto overflow-x-hidden">
      {loading && (
        <div className="p-4 text-center text-neutral-500">Caricamento...</div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="p-8 text-center text-neutral-500">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Nessuna notifica</p>
        </div>
      )}

      {!loading && notifications.map((notif) => (
        <div
          key={notif.id}
          className={`p-3 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 ${notif.priority === 'high' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                {notif.type === 'booking' && (
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {notif.type === 'payment' && (
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {notif.type === 'maintenance' && (
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{notif.message}</p>
                {notif.priority === 'high' && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">Urgente</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  // navigate: if notification has relatedId, open that booking; otherwise open day view
                  if (notif.relatedId) {
                    window.dispatchEvent(new CustomEvent('navigate:booking', { detail: { bookingId: notif.relatedId } }))
                  } else if (notif.date) {
                    window.dispatchEvent(new CustomEvent('navigate:booking', { detail: { date: notif.date } }))
                  }
                  setShowPopup(false)
                }}
                title="Apri prenotazione"
                className="p-2 rounded border bg-white/50 dark:bg-neutral-700/50 flex items-center justify-center"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 10l4 4-4 4M19 14H9"/></svg>
              </button>

              <button
                onClick={() => { const ids = readIds.includes(notif.id) ? readIds.filter(i => i !== notif.id) : [...readIds, notif.id]; setReadIds(ids); localStorage.setItem('notifs:read', JSON.stringify(ids)); }}
                title={readIds.includes(notif.id) ? 'Segna non letto' : 'Segna come letto'}
                className="p-2 rounded border flex items-center justify-center"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </button>

              <button
                onClick={() => { setNotifications(ns => ns.filter(n => n.id !== notif.id)); if (readIds.includes(notif.id)) { const ids = readIds.filter(i => i !== notif.id); setReadIds(ids); localStorage.setItem('notifs:read', JSON.stringify(ids)); } }}
                title="Elimina"
                className="p-2 rounded text-red-600 flex items-center justify-center"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6M10 6V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // notification list content for desktop dropdown (with header)
  const notificationsContent = (
    <>
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <h3 className="font-semibold">Notifiche</h3>
        <button
          onClick={() => { setShowPopup(false) }}
          className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          aria-label="Chiudi pannello notifiche"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto overflow-x-hidden">
        {notificationItems}
      </div>

      <div className="p-2 border-t border-neutral-200 dark:border-neutral-700">
        <button
          onClick={loadNotifications}
          className="w-full text-sm text-center py-2 text-blue-600 dark:text-blue-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded"
        >
          Ricarica
        </button>
      </div>
    </>
  )

  return (
    <div className="relative">
      <button
        onClick={() => {
            let mobile = false
            try {
              const mq = window.matchMedia('(max-width: 767.98px)')
              mobile = mq.matches || Boolean(navigator?.maxTouchPoints) || ('ontouchstart' in window)
            } catch {
              mobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false
            }
            setIsMobile(mobile)
            setShowPopup(s => !s)
          } }
        className="relative p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        aria-label="Notifiche"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPopup && (
        isMobile ? (
          <Modal isOpen={true} onClose={() => setShowPopup(false)} title="Notifiche" autoFocus={false} mobileDropdown={true}>
            <div className="space-y-0">
              {notificationItems}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={loadNotifications}
                  className="w-full text-sm text-center py-2 text-blue-600 dark:text-blue-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded"
                >
                  Ricarica
                </button>
              </div>
            </div>
          </Modal>
        ) : (
          <Card as="div" className="absolute right-0 mt-2 w-80 max-w-[95vw] p-0 z-50">
            {notificationsContent}
          </Card>
        )
      )}

      {/* Notification detail modal */}
      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setSelected(null); }} title={selected ? 'Dettaglio notifica' : 'Dettaglio'} fullScreenMobile={true}>
        {selected && (
          <div className="space-y-4">
            <div className="text-sm text-neutral-700 dark:text-neutral-300">{selected.message}</div>
            <div>
              {selected.type === 'booking' && (
                <BookingDetails />
              )}
              {selected.type === 'payment' && (
                <PaymentDetails />
              )}
              {selected.type === 'maintenance' && (
                <MaintenanceDetails />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const ids = [...readIds.filter(i => i !== selected.id), selected.id]; setReadIds(ids); localStorage.setItem('notifs:read', JSON.stringify(ids)); }} className="px-3 py-1 rounded border">Segna come letto</button>
              <button onClick={() => { setNotifications(ns => ns.filter(n => n.id !== selected.id)); setShowDetail(false); setSelected(null); }} className="px-3 py-1 rounded text-red-600">Elimina</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
