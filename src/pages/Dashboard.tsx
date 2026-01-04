import React, { useEffect, useState } from 'react'
import Sups from '../components/Sups'
import Packages from '../components/Packages'
import Bookings from '../components/Bookings'
import Expenses from '../components/Expenses'
import Equipment from '../components/Equipment'
import StatCard from '../components/ui/StatCard'
import { supabase } from '../lib/supabaseClient'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

export default function Dashboard({ page = 'dashboard' }: { page?: string }) {
  const [availableSups, setAvailableSups] = useState<number | null>(null)
  const [todaysBookings, setTodaysBookings] = useState<number | null>(null)
  const [todaysIncome, setTodaysIncome] = useState<number | null>(null)
  const [todaysExpenses, setTodaysExpenses] = useState<number | null>(null)

  // Dashboard report data
  const [start, setStart] = useState(() => { const d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10) })
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0,10))
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([])
  const [dailyOrders, setDailyOrders] = useState<any[]>([])
  const [revByEquip, setRevByEquip] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [ivaPercent, setIvaPercent] = useState<number>(22)

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

      // Dashboard reports (last 30d)
      try {
        const { data: dr } = await supabase.rpc('report_daily_revenue', { start_date: start, end_date: end })
        setDailyRevenue(dr ?? [])
      } catch (e) { setDailyRevenue([]) }

      try {
        const { data: dox } = await supabase.rpc('report_daily_orders', { start_date: start, end_date: end })
        setDailyOrders(dox ?? [])
      } catch (e) { setDailyOrders([]) }

      try {
        const { data: rbe } = await supabase.rpc('report_revenue_by_equipment', { start_date: start, end_date: end })
        setRevByEquip(rbe ?? [])
      } catch (e) { setRevByEquip([]) }

      try {
        const { data: top } = await supabase.rpc('report_top_products', { start_date: start, end_date: end, limit: 6 })
        setTopProducts(top ?? [])
      } catch(e) { setTopProducts([]) }

      // IVA
      try {
        const { data: setting } = await supabase.from('app_setting').select('value').eq('key','iva_percent').single()
        const ivaVal = setting?.value ? Number(setting.value) : 22
        setIvaPercent(Number.isFinite(ivaVal) ? ivaVal : 22)
      } catch(e) { setIvaPercent(22) }
    }

    loadStats()
  }, [start, end])

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <StatCard title="Entrate" value={(Number(todaysIncome ?? 0)).toFixed(2) + ' €'} />
            <StatCard title="Ordini" value={todaysBookings ?? 0} />
            <StatCard title="Spese" value={(Number(todaysExpenses ?? 0)).toFixed(2) + ' €'} />
            <StatCard title="IVA" value={( (Number(todaysIncome ?? 0) * ivaPercent/100)).toFixed(2) + ' €'} />
            <StatCard title="Profitto" value={( (Number(todaysIncome ?? 0) - Number(todaysExpenses ?? 0) - (Number(todaysIncome ?? 0) * ivaPercent/100) ).toFixed(2) + ' €')} />
            <div />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm">Da</label>
            <input type="date" className="border px-2 py-1 rounded" value={start} onChange={(e)=>setStart(e.target.value)} />
            <label className="text-sm">A</label>
            <input type="date" className="border px-2 py-1 rounded" value={end} onChange={(e)=>setEnd(e.target.value)} />
            <div className="flex-1" />
            <button onClick={()=>{ /* triggers useEffect */ }} className="px-3 py-1 rounded bg-brand-500 text-white">Applica</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-neutral-500 mb-2">Incassi nel Periodo</div>
              <div className="h-56 bg-white/5 rounded p-3"><Line data={{ labels: dailyRevenue.map(d=>d.day), datasets:[{ label:'Entrate', data: dailyRevenue.map(d=>Number(d.revenue)), borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)' }] }} /></div>
            </div>

            <div>
              <div className="text-sm text-neutral-500 mb-2">Ordini nel Periodo</div>
              <div className="h-56 bg-white/5 rounded p-3"><Line data={{ labels: dailyOrders.map(d=>d.day), datasets:[{ label:'Ordini', data: dailyOrders.map(d=>Number(d.orders)), borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)' }] }} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-neutral-500 mb-2">Ripartizione per Attrezzatura</div>
              <div className="h-48 bg-white/5 rounded p-3">
                <table className="w-full text-sm">
                  <tbody>
                    {revByEquip.map((r:any)=> (
                      <tr key={r.equipment} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">{r.equipment}</td><td className="py-2">{r.bookings_count}</td><td className="py-2">{Number(r.revenue).toFixed(2)} €</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-sm text-neutral-500 mb-2">Prodotti più venduti</div>
              <div className="h-48 bg-white/5 rounded p-3 overflow-auto">
                <ol className="list-decimal list-inside space-y-2">
                  {topProducts.map((p:any,idx:number)=> (
                    <li key={p.name||idx} className="flex items-center justify-between"><span>{p.name}</span><span className="text-sm text-neutral-400">{p.bookings_count} • {Number(p.revenue).toFixed(2)} €</span></li>
                  ))}
                </ol>
              </div>
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
