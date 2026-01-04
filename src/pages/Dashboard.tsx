import React, { useEffect, useState } from 'react'
import Sups from '../components/Sups'
import Packages from '../components/Packages'
import Bookings from '../components/Bookings'
import Expenses from '../components/Expenses'
import Equipment from '../components/Equipment'
import StatCard from '../components/ui/StatCard'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard({ page = 'dashboard' }: { page?: string }) {
  const [availableSups, setAvailableSups] = useState<number | null>(null)
  const [todaysBookings, setTodaysBookings] = useState<number | null>(null)
  const [todaysIncome, setTodaysIncome] = useState<number | null>(null)
  const [todaysExpenses, setTodaysExpenses] = useState<number | null>(null)

  useEffect(() => {
    async function loadStats() {
      // Available SUPs
      const { count: supCount } = await supabase.from('sup').select('id', { count: 'exact' }).eq('status', 'available')
      setAvailableSups(supCount ?? 0)

      // Today's bookings
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const { count: bookingsCount } = await supabase
        .from('booking')
        .select('id', { count: 'exact' })
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
      setTodaysBookings(bookingsCount ?? 0)

      // Today's income
      const { data: incomeData } = await supabase
        .from('booking')
        .select('price')
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
      const income = (incomeData || []).reduce((s: number, r: any) => s + Number(r.price || 0), 0)
      setTodaysIncome(income)

      // Today's expenses
      const { data: expData } = await supabase
        .from('expense')
        .select('amount')
        .gte('date', todayStart.toISOString().slice(0, 10))
        .lte('date', todayEnd.toISOString().slice(0, 10))
      const expenses = (expData || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
      setTodaysExpenses(expenses)
    }

    loadStats()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-300">Panoramica attività — accesso pubblico</p>
        </div>
      </div>

      {page === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="SUP disponibili" value={availableSups ?? '—'} />
            <StatCard title="Prenotazioni oggi" value={todaysBookings ?? '—'} />
            <StatCard title="Incassi oggi" value={(todaysIncome ?? 0).toFixed(2) + ' €'} />
            <StatCard title="Spese oggi" value={(todaysExpenses ?? 0).toFixed(2) + ' €'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Sups />
            </div>
            <div>
              <Bookings />
              <Packages />
            </div>
          </div>
        </>
      )}

      {page === 'equipment' && <Equipment />}
      {page === 'bookings' && <Bookings />}
      {page === 'packages' && <Packages />}
      {page === 'expenses' && <Expenses />}

      <div className="mt-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Usa la sidebar per navigare tra le sezioni.</div>
      </div>
    </div>
  )
}
