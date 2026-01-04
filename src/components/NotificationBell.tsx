import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Card from './ui/Card'

type Notification = {
  id: string
  type: 'payment' | 'booking' | 'maintenance'
  message: string
  priority: 'high' | 'medium' | 'low'
  date?: Date
  relatedId?: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNotifications()
    // Ricarica ogni 5 minuti
    const interval = setInterval(loadNotifications, 300000)
    return () => clearInterval(interval)
  }, [])

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
        })
      }

      // 2. Pagamenti in sospeso
      const { data: unpaidBookings } = await supabase
        .from('booking')
        .select('id, customer_name, price')
        .eq('paid', false)
        .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // ultimi 7 giorni

      if (unpaidBookings && unpaidBookings.length > 0) {
        const total = unpaidBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0)
        notifs.push({
          id: 'unpaid-bookings',
          type: 'payment',
          message: `${unpaidBookings.length} pagamento${unpaidBookings.length > 1 ? 'i' : ''} in sospeso (€${total.toFixed(2)})`,
          priority: 'medium',
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

  const highPriorityCount = notifications.filter((n) => n.priority === 'high').length

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopup(!showPopup)}
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
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {showPopup && (
        <Card as="div" className="absolute right-0 mt-2 w-80 p-0 z-50">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <h3 className="font-semibold">Notifiche</h3>
            <button
              onClick={() => setShowPopup(false)}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
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
                className={`p-3 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer ${notif.priority === 'high' ? 'bg-red-50 dark:bg-red-900/10' : ''} animate-fade-up`}
              >
                <div className="flex items-start gap-3">
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
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {notif.message}
                    </p>
                    {notif.priority === 'high' && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                        Urgente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={loadNotifications}
              className="w-full text-sm text-center py-2 text-blue-600 dark:text-blue-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded"
            >
              Ricarica
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
