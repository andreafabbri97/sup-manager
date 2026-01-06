import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import PageTitle from '../components/ui/PageTitle'
import Archive from './Archive'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

function toCSV(rows: any[], headers: string[]) {
  const esc = (v: any) => (v === null || v === undefined ? '' : String(v).replace(/"/g, '""'))
  const csv = [headers.join(',')]
  for (const r of rows) {
    csv.push(headers.map((h) => `"${esc(r[h] ?? '')}"`).join(','))
  }
  return csv.join('\n')
}

export default function Reports() {
  const [tab, setTab] = useState<'reports'|'admin'>(() => {
    if (typeof window === 'undefined') return 'reports'
    const v = window.localStorage.getItem('reports_tab')
    return v === 'admin' ? 'admin' : 'reports'
  })
  const [excludeIva, setExcludeIva] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const v = window.localStorage.getItem('reports_exclude_iva')
      return v === '1' || v === 'true'
    } catch (e) { return false }
  })

  // persist excludeIva to localStorage
  useEffect(() => {
    try { window.localStorage.setItem('reports_exclude_iva', excludeIva ? '1' : '0') } catch (e) {}
  }, [excludeIva])
  const [start, setStart] = useState(() => {
    if (typeof window === 'undefined') {
      const d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10)
    }
    const stored = window.localStorage.getItem('reports_start')
    if (stored) return stored
    const d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10)
  })
  const [end, setEnd] = useState(() => {
    if (typeof window === 'undefined') return new Date().toISOString().slice(0,10)
    return window.localStorage.getItem('reports_end') || new Date().toISOString().slice(0,10)
  })

  const [revByEquip, setRevByEquip] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
  const [dailyOrders, setDailyOrders] = useState<any[]>([])
  const [summary, setSummary] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [usedFallbackAggregation, setUsedFallbackAggregation] = useState(false)

  // advanced metrics
  const [prevRevenueSum, setPrevRevenueSum] = useState<number>(0)
  const [prevOrdersCount, setPrevOrdersCount] = useState<number>(0)
  const [revenueChangePct, setRevenueChangePct] = useState<number>(0)
  const [ordersChangePct, setOrdersChangePct] = useState<number>(0)
  const [avgBookingsPerDay, setAvgBookingsPerDay] = useState<number>(0)
  const [avgRevenuePerDay, setAvgRevenuePerDay] = useState<number>(0)
  const [avgBookingValue, setAvgBookingValue] = useState<number>(0)

  // Metrics
  const [ivaPercent, setIvaPercent] = useState<number>(22)
  const [bookingsCount, setBookingsCount] = useState<number>(0)
  const [topProducts, setTopProducts] = useState<any[]>([])


  // Admin (expenses)
  const [expenses, setExpenses] = useState<any[]>([])
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editExpense, setEditExpense] = useState<any | null>(null)
  const [expenseDate, setExpenseDate] = useState(() => {
    if (typeof window === 'undefined') return new Date().toISOString().slice(0,10)
    return new Date().toISOString().slice(0,10)
  })

  // Detail modal for expenses
  const [showExpenseDetail, setShowExpenseDetail] = useState(false)
  const [detailExpense, setDetailExpense] = useState<any|null>(null)

  const handleCloseExpenseModal = useCallback(() => {
    setShowExpenseModal(false)
    setAmount('')
    setCategory('')
    setNotes('')
    setReceiptFile(null)
    setExpenseDate(new Date().toISOString().slice(0,10))
    setEditExpense(null)
  }, [])

  useEffect(() => { loadReports()
    const onSettings = () => loadReports()
    window.addEventListener('settings:changed', onSettings as any)
    return () => window.removeEventListener('settings:changed', onSettings as any)
  }, [])

  // Persist selected tab across page reloads
  useEffect(() => {
    try { window.localStorage.setItem('reports_tab', tab) } catch (e) {}
  }, [tab])

  // Persist date range
  useEffect(() => {
    try { window.localStorage.setItem('reports_start', start); window.localStorage.setItem('reports_end', end) } catch (e) {}
  }, [start, end])

  async function loadReports() {
    setLoading(true)
    setUsedFallbackAggregation(false)
    const { data: rev } = await supabase.rpc('report_revenue_by_equipment', { start_date: start, end_date: end })
    setRevByEquip(rev ?? [])
    const { data: d } = await supabase.rpc('report_daily_revenue', { start_date: start, end_date: end })
    setDaily(d ?? [])
    try {
      const { data: od } = await supabase.rpc('report_daily_orders', { start_date: start, end_date: end })
      setDailyOrders(od ?? [])
    } catch (e) {
      setDailyOrders([])
    }
    // compute current sums and averages
    const currentRevenue = (d ?? []).reduce((s:any,x:any)=>s + Number(x.revenue ?? 0), 0)
    // fetch daily orders once more safely to compute currentOrders
    let currentOrders = 0
    try {
      const { data: od2 } = await supabase.rpc('report_daily_orders', { start_date: start, end_date: end })
      currentOrders = (od2 ?? []).reduce((s:any,x:any)=>s + Number(x.orders ?? x.count ?? 0), 0)
    } catch (e) {
      currentOrders = 0
    }

    // compute previous period (same length immediately before start)
    const sDate = new Date(start)
    const eDate = new Date(end)
    const msPerDay = 1000*60*60*24
    const days = Math.round((eDate.getTime() - sDate.getTime()) / msPerDay) + 1
    const prevEnd = new Date(sDate.getTime() - msPerDay)
    const prevStart = new Date(prevEnd.getTime() - (days-1)*msPerDay)
    const fmt = (d: Date) => d.toISOString().slice(0,10)

    const { data: prevDailyRev } = await supabase.rpc('report_daily_revenue', { start_date: fmt(prevStart), end_date: fmt(prevEnd) })
    const { data: prevDailyOrders } = await supabase.rpc('report_daily_orders', { start_date: fmt(prevStart), end_date: fmt(prevEnd) })
    const prevRevSum = (prevDailyRev ?? []).reduce((s:any,x:any)=>s + Number(x.revenue ?? 0), 0)
    const prevOrdSum = (prevDailyOrders ?? []).reduce((s:any,x:any)=>s + Number(x.orders ?? x.count ?? 0), 0)
    setPrevRevenueSum(prevRevSum)
    setPrevOrdersCount(prevOrdSum)

    // percentage change (handle zero previous)
    const revPct = prevRevSum === 0 ? (currentRevenue === 0 ? 0 : 100) : ((currentRevenue - prevRevSum) / Math.abs(prevRevSum) * 100)
    const ordPct = prevOrdSum === 0 ? (currentOrders === 0 ? 0 : 100) : ((currentOrders - prevOrdSum) / Math.abs(prevOrdSum) * 100)
    setRevenueChangePct(Number.isFinite(revPct) ? revPct : 0)
    setOrdersChangePct(Number.isFinite(ordPct) ? ordPct : 0)

    setAvgBookingsPerDay(days > 0 ? currentOrders / days : 0)
    setAvgRevenuePerDay(days > 0 ? currentRevenue / days : 0)
    setAvgBookingValue(currentOrders > 0 ? currentRevenue / currentOrders : 0)
    const { data: s } = await supabase.rpc('report_margin', { start_date: start, end_date: end })
    setSummary(s ?? [])

    // load IVA setting
    const { data: setting } = await supabase.from('app_setting').select('value').eq('key','iva_percent').single()
    const ivaVal = setting?.value ? Number(setting.value) : 22
    setIvaPercent(Number.isFinite(ivaVal) ? ivaVal : 22)

    // bookings count - prefer server-side counts but fall back to computed daily orders if server returns 0
    try {
      const { data: counts } = await supabase.rpc('report_counts', { start_date: start, end_date: end })
      const bcRpc = counts?.find((c:any)=>c.metric==='bookings')?.value ?? 0
      // if RPC returns 0 (or undefined), fallback to summing daily orders we already fetched
      const finalBc = (Number(bcRpc) > 0) ? Number(bcRpc) : currentOrders
      setBookingsCount(Number(finalBc))
    } catch (e) { setBookingsCount(Number(currentOrders)) }

    // top products
    try {
      const { data: top } = await supabase.rpc('report_top_products', { start_date: start, end_date: end, p_limit: 10 })
      const topArr = top ?? []
      setTopProducts(topArr)
      // Fallback: if revenue-by-equipment returned no rows, use top products data (merge equipment + packages)
      if ((!rev || (Array.isArray(rev) && rev.length === 0)) && topArr.length > 0) {
        const mapped = topArr.map((t:any) => ({ equipment: t.name, bookings_count: t.bookings_count, revenue: t.revenue }))
        setRevByEquip(mapped)
      }

      // Additional fallback: if both rev and top products are empty but there are bookings,
      // aggregate from the bookings table as a best-effort fallback so users still see stats.
      if ((!rev || (Array.isArray(rev) && rev.length === 0)) && topArr.length === 0) {
        try {
          const { data: bookings } = await supabase
            .from('booking')
            .select('id, price, package_id, package(name), equipment_items')
            .gte('start_time', start)
            .lte('start_time', end)

          if (bookings && bookings.length > 0) {
            // collect equipment ids referenced in bookings
            const equipIds = new Set<any>()
            bookings.forEach((b:any) => {
              if (Array.isArray(b.equipment_items)) b.equipment_items.forEach((it:any) => equipIds.add(it.id))
            })

            // fetch equipment names for mapping
            const equipmentMap: Record<string,string> = {}
            if (equipIds.size > 0) {
              const { data: equips } = await supabase.from('equipment').select('id, name').in('id', Array.from(equipIds))
              (equips || []).forEach((e:any) => { equipmentMap[String(e.id)] = e.name })
            }

            // aggregate counts and revenue (distribute booking price across referenced items)
            const prodMap: Record<string, { bookings_count: number, revenue: number }> = {}
            for (const b of bookings) {
              const price = Number(b.price ?? 0)
              const pkgName = b.package?.name
              const equipItems = Array.isArray(b.equipment_items) ? b.equipment_items : []

              const itemsCount = (pkgName ? 1 : 0) + equipItems.reduce((s:any, it:any) => s + Number(it.quantity || 1), 0) || 1
              const share = itemsCount > 0 ? price / itemsCount : 0

              if (pkgName) {
                const name = pkgName || 'Pacchetto'
                prodMap[name] = prodMap[name] || { bookings_count: 0, revenue: 0 }
                prodMap[name].bookings_count += 1
                prodMap[name].revenue += share
              }

              // count each equipment as one booking occurrence (not multiplied by quantity) but revenue by qty
              const seenEquip = new Set<any>()
              for (const it of equipItems) {
                const id = it.id
                const qty = Number(it.quantity || 1)
                const name = equipmentMap[String(id)] || `Attrezzatura ${id}`
                prodMap[name] = prodMap[name] || { bookings_count: 0, revenue: 0 }
                if (!seenEquip.has(id)) { prodMap[name].bookings_count += 1; seenEquip.add(id) }
                prodMap[name].revenue += share * qty
              }
            }

            const topFromBookings = Object.entries(prodMap).map(([name, v]) => ({ name, bookings_count: v.bookings_count, revenue: Number(v.revenue.toFixed(2)) }))
            // set both topProducts and revByEquip so UI shows meaningful data
            setTopProducts(topFromBookings.sort((a:any,b:any)=>b.revenue - a.revenue))
            setRevByEquip(topFromBookings.map((t:any)=>({ equipment: t.name, bookings_count: t.bookings_count, revenue: t.revenue })))
            setUsedFallbackAggregation(true)
          }
        } catch (err) {
          // ignore and keep arrays empty
          console.warn('Fallback aggregation from bookings failed', err)
        }
      }
    } catch (e) { setTopProducts([]) }

    setLoading(false)
  }

  const [expenseFilterStart, setExpenseFilterStart] = useState<string>(() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10) })
  const [expenseFilterEnd, setExpenseFilterEnd] = useState<string>(() => new Date().toISOString().slice(0,10))

  async function loadExpenses(start?: string, end?: string) {
    let q: any = supabase.from('expense').select('*').order('date', { ascending: false }).limit(500)
    if (start) q = q.gte('date', start)
    if (end) q = q.lte('date', end)
    const { data } = await q
    setExpenses(data ?? [])
  }

  // If tab restored as 'admin' on load, ensure expenses are fetched

  useEffect(() => {
    // when switching to admin, load expenses using the Admin card filters (expenseFilterStart/end)
    if (tab === 'admin') { loadExpenses(expenseFilterStart, expenseFilterEnd) }
  }, [tab, expenseFilterStart, expenseFilterEnd])




  async function createExpense(e: React.FormEvent) {
    e.preventDefault()
    let receipt_url = null
    if (receiptFile) {
      try {
        const name = `receipts/${Date.now()}_${receiptFile.name}`
        const { data: up, error: uerr } = await supabase.storage.from('receipts').upload(name, receiptFile)
        if (uerr) throw uerr
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(name)
        receipt_url = urlData.publicUrl
      } catch (err: any) {
        alert('Errore upload ricevuta: ' + (err.message || err))
        return
      }
    }

    const parsedAmount = Number(String(amount).replace(',', '.'))
    if (!Number.isFinite(parsedAmount)) return alert('Importo non valido')
    if (editExpense) {
      // update
      const payload: any = { amount: parsedAmount, category, notes, date: expenseDate }
      if (receipt_url) payload.receipt_url = receipt_url
      const { error } = await supabase.from('expense').update(payload).eq('id', editExpense.id)
      if (error) return alert(error.message)
      setEditExpense(null)
    } else {
      const { error } = await supabase.from('expense').insert([{ amount: parsedAmount, category, notes, date: expenseDate, receipt_url }])
      if (error) return alert(error.message)
    }

    setAmount(''); setCategory(''); setNotes(''); setReceiptFile(null); setExpenseDate(new Date().toISOString().slice(0,10))
    loadExpenses()
  }

  async function openEditExpense(ex: any) {
    setEditExpense(ex)
    setAmount(String(ex.amount ?? ''))
    setCategory(ex.category ?? '')
    setNotes(ex.notes ?? '')
    setExpenseDate(ex.date ? ex.date.slice(0,10) : new Date().toISOString().slice(0,10))
    setReceiptFile(null)
    setShowExpenseModal(true)
  }

  async function deleteExpense(id: string) {
    if (!confirm('Eliminare questa spesa?')) return
    const { error } = await supabase.from('expense').delete().eq('id', id)
    if (error) return alert(error.message)
    loadExpenses()
  }

  function downloadCSV(rows: any[], filename: string) {
    if (!rows || rows.length === 0) return alert('Nessun dato')
    const headers = Object.keys(rows[0])
    const csv = toCSV(rows, headers)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Chart styling (keep charts visible in both light and dark themes)
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const axisColor = isDark ? '#9CA3AF' : '#374151'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640

  const ordersData = {
    labels: dailyOrders.map((d) => d.day),
    datasets: [ { label: 'Ordini', data: dailyOrders.map((d) => Number(d.orders ?? d.count ?? 0)), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', fill: true } ]
  }

  const revenueData = {
    labels: daily.map((d) => d.day),
    datasets: [ { label: 'Entrate', data: daily.map((d) => Number(d.revenue)), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', fill: true } ]
  }

  // derived metrics for enhanced report overview
  const bestDayObj = daily.length ? daily.reduce((a:any,b:any)=> Number(b.revenue) > Number(a.revenue) ? b : a) : null
  const bestDayLabel = bestDayObj ? `${bestDayObj.day} (${Number(bestDayObj.revenue).toFixed(2)} €)` : '—'
  const peakOrdersObj = dailyOrders.length ? dailyOrders.reduce((a:any,b:any)=> Number(b.orders ?? b.count ?? 0) > Number(a.orders ?? a.count ?? 0) ? b : a) : null
  const peakOrdersLabel = peakOrdersObj ? `${peakOrdersObj.day} (${Number(peakOrdersObj.orders ?? peakOrdersObj.count ?? 0)} )` : '—'
  const revenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: axisColor }, position: isSmall ? 'bottom' : 'top' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || ''
            const val = ctx.parsed?.y ?? ctx.parsed ?? 0
            return `${label}: ${Number(val).toFixed(2)} €`
          }
        }
      }
    },
    animation: { duration: 700, easing: 'easeOutCubic' },
    elements: { point: { radius: 3 } },
    scales: {
      x: { ticks: { color: axisColor }, grid: { color: gridColor } },
      y: { ticks: { color: axisColor, callback: (v: any) => `${Number(v).toFixed(0)} €` }, grid: { color: gridColor }, position: 'left' }
    }
  }

  // Options for orders chart (integer counts)
  const ordersOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: axisColor }, position: isSmall ? 'bottom' : 'top' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || ''
            const val = ctx.parsed?.y ?? ctx.parsed ?? 0
            return `${label}: ${Number(val).toFixed(0)}`
          }
        }
      }
    },
    animation: { duration: 700, easing: 'easeOutCubic' },
    elements: { point: { radius: 3 } },
    scales: {
      x: { ticks: { color: axisColor }, grid: { color: gridColor } },
      y: { ticks: { color: axisColor, callback: (v: any) => `${Number(v).toFixed(0)}` , stepSize: 1}, grid: { color: gridColor }, position: 'left' }
    }
  }

  

  // derive profit value using excludeIva toggle (when excluded, IVA is zeroed)
  const revenueSum = Number(summary.find(s=>s.metric==='revenue')?.value ?? 0)
  const revenueInvoiced = Number(summary.find(s=>s.metric==='revenue_invoiced')?.value ?? 0)
  const expensesSum = Number(summary.find(s=>s.metric==='expenses')?.value ?? 0)
  const ivaAmount = excludeIva ? 0 : (revenueInvoiced * ivaPercent/100)
  const profitValue = (revenueSum - expensesSum - ivaAmount).toFixed(2) + ' €'

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-3">
        <PageTitle className="m-0">Amministrazione e Report</PageTitle>
        <div className="flex items-center gap-4">
          <div role="tablist" aria-label="Sezioni report" className="inline-flex rounded bg-neutral-100 dark:bg-neutral-800 p-1">
            <button role="tab" aria-selected={tab==='reports'} onClick={()=>setTab('reports')} className={`px-3 py-1 rounded ${tab==='reports' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Reports</button>
            <button role="tab" aria-selected={tab==='admin'} onClick={()=>{ setTab('admin'); loadExpenses(expenseFilterStart, expenseFilterEnd) }} className={`px-3 py-1 rounded ${tab==='admin' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Amministrazione</button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={excludeIva} onChange={(e)=>setExcludeIva(e.target.checked)} className="border rounded" />
            Escludi IVA
          </label>
        </div>
      </div>

      {/* Date filters (applied to both Reports and Admin) */}
      <div className="mb-4">
        <div className="flex gap-2 items-center flex-nowrap overflow-x-auto">
          <label className="whitespace-nowrap">Da</label>
          <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="border px-2 py-1 rounded w-36 sm:w-auto flex-shrink-0" />
          <label className="whitespace-nowrap">A</label>
          <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="border px-2 py-1 rounded w-36 sm:w-auto flex-shrink-0" />
          <button
            onClick={async () => {
              setIsRefreshing(true)
              try {
                if (tab === 'reports') await loadReports()
                else await loadExpenses(start, end)
              } finally {
                setIsRefreshing(false)
              }
            }}
            title={isRefreshing ? 'Aggiornamento...' : 'Aggiorna'}
            aria-label={isRefreshing ? 'Aggiornamento in corso' : 'Aggiorna'}
            className="ml-2 p-2 rounded bg-amber-500 text-white hover:bg-amber-600 focus-ring disabled:opacity-60 flex-shrink-0"
            disabled={isRefreshing}
          >
            <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 10-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Top metrics (mobile scrollable) */}
      <div className="mb-4 sm:mb-6">
          {usedFallbackAggregation && (
            <div className="mb-2 text-sm text-amber-400">Dati derivati da aggregazione locale (fallback): alcuni report server non hanno restituito dati completi.</div>
          )}
          <div className="flex flex-wrap gap-3 sm:gap-4 pb-2">
          <StatCard title="Entrate" value={revenueSum.toFixed(2) + ' €'} color="accent" />
          <StatCard title="Incasso/giorno" value={avgRevenuePerDay.toFixed(2) + ' €'} color="accent" />
          <StatCard title="Ordini" value={bookingsCount} color="neutral" />
          <StatCard title="Prenotazioni/giorno" value={avgBookingsPerDay.toFixed(2)} color="neutral" />
          <StatCard title="Spese" value={expensesSum.toFixed(2) + ' €'} color="warning" />
          {!excludeIva && <StatCard title="IVA" value={(ivaAmount).toFixed(2) + ' €'} color="neutral" />}
          <StatCard title="Profitto" value={profitValue} color="success" />
        </div>
      </div>

      {tab === 'reports' && (
        <>
          <Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="mb-4 sm:mb-6">
                  <div className="text-sm text-neutral-500 mb-2">Ordini giornalieri</div>
                  <div className="h-64 sm:h-72 lg:h-80 animate-fade-up"><div className="h-full"><Line data={ordersData} options={ordersOptions} /></div></div>
                </div>
                <div className="mb-4 sm:mb-6">
                  <div className="text-sm text-neutral-500 mb-2">Entrate giornaliere</div>
                  <div className="h-64 sm:h-72 lg:h-80 animate-fade-up"><div className="h-full"><Line data={revenueData} options={revenueOptions} /></div></div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Entrate per attrezzatura</div>

                  {/* Table for sm+ */}
                  <div className="hidden sm:block mt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-neutral-500"><th>Attrezzatura</th><th>Prenotazioni</th><th>Incasso</th></tr>
                      </thead>
                      <tbody>
                        {revByEquip.map((r:any)=> (
                          <tr key={r.equipment} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                            <td className="py-2">{r.equipment}</td>
                            <td className="py-2">{r.bookings_count}</td>
                            <td className="py-2">{Number(r.revenue).toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Stacked cards for mobile */}
                  <div className="sm:hidden mt-2 space-y-2">
                    {revByEquip.map((r:any)=> (
                      <Card key={r.equipment} className="interactive">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{r.equipment}</div>
                          <div className="text-sm text-neutral-500">{Number(r.revenue).toFixed(2)} €</div>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">Prenotazioni: {r.bookings_count}</div>
                      </Card>
                    ))}
                    {revByEquip.length === 0 && <div className="text-neutral-500">Nessuna entrata</div>}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <div className="text-sm text-neutral-500">Statistiche rapide</div>
                  <div className="mt-2 space-y-2">
                    <Card className="p-2">
                      <div className="text-xs text-neutral-400">Valore medio prenotazione</div>
                      <div className="font-medium text-lg">{avgBookingValue.toFixed(2)} €</div>
                    </Card>
                    <div className="p-2 rounded bg-white/5 dark:bg-slate-800">
                      <div className="text-xs text-neutral-400">Giorno migliore (ricavi)</div>
                      <div className="font-medium text-lg">{bestDayLabel}</div>
                    </div>
                    <div className="p-2 rounded bg-white/5 dark:bg-slate-800">
                      <div className="text-xs text-neutral-400">Giorno con più ordini</div>
                      <div className="font-medium text-lg">{peakOrdersLabel}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Top attrezzature (incasso)</div>
                  <div className="mt-2">
                    {revByEquip.slice(0,3).map((r:any)=> (
                      <div key={r.equipment} className="py-2 border-b border-neutral-100 dark:border-neutral-800 flex justify-between">
                        <div className="font-medium">{r.equipment}</div>
                        <div className="text-sm text-neutral-500">{Number(r.revenue).toFixed(2)} €</div>
                      </div>
                    ))}
                    {revByEquip.length === 0 && <div className="text-neutral-500 mt-2">Nessuna entrata</div>}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-medium">Attrezzature / Pacchetti più richiesti</div>
              <div>
                <Button onClick={()=>downloadCSV(topProducts,'top-products.csv')}>Esporta CSV</Button>
              </div>
            </div>
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500"><th>Prodotto</th><th>Prenotazioni</th><th>Incasso</th></tr>
                </thead>
                <tbody>
                  {topProducts.map((p:any, idx:number)=> (
                    <tr key={p.name||idx} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">{p.name ?? '—'}</td><td>{p.bookings_count}</td><td>{Number(p.revenue).toFixed(2)} €</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden space-y-2">
              {topProducts.map((p:any, idx:number)=> (
                <div key={p.name||idx} className="p-3 rounded border bg-white/5 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.name ?? '—'}</div>
                    <div className="text-sm text-neutral-500">€ {Number(p.revenue).toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">Prenotazioni: {p.bookings_count}</div>
                </div>
              ))}
              {topProducts.length === 0 && <div className="text-neutral-500">Nessun prodotto</div>}
            </div>
          </Card>
        </>
      )}

      {tab === 'admin' && (
        <Card>
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium">Gestione Spese</h3>
            </div>
            <div className="flex flex-row gap-2 w-full">
                <Button onClick={() => { setEditExpense(null); setExpenseDate(new Date().toISOString().slice(0,10)); setShowExpenseModal(true) }} className="flex-1">Aggiungi spesa</Button>
                <Button onClick={() => loadExpenses(expenseFilterStart, expenseFilterEnd)} className="bg-gray-600 flex-1">Applica filtro</Button>
                <Button onClick={() => { setExpenseFilterStart(new Date(new Date().setMonth(new Date().getMonth()-1)).toISOString().slice(0,10)); setExpenseFilterEnd(new Date().toISOString().slice(0,10)); loadExpenses(); }} className="bg-gray-600 flex-1">Reset</Button>
              </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-500">Da</label>
              <input type="date" value={expenseFilterStart} onChange={(e)=>setExpenseFilterStart(e.target.value)} className="border px-2 py-1 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-500">A</label>
              <input type="date" value={expenseFilterEnd} onChange={(e)=>setExpenseFilterEnd(e.target.value)} className="border px-2 py-1 rounded" />
            </div>
          </div>

          <div className="mt-2">
            {/* Mobile stacked cards */}
            <div className="sm:hidden space-y-2">
              {expenses.map((ex:any) => (
                <button key={ex.id} onClick={() => { setShowExpenseDetail(true); setDetailExpense(ex) }} className="w-full text-left p-3 rounded border bg-white/5 dark:bg-slate-800 flex items-start justify-between">
                  <div>
                    <div className="font-medium">{ex.category}</div>
                    <div className="text-xs text-neutral-400">{ex.date} • € {Number(ex.amount).toFixed(2)}</div>
                    {ex.receipt_url && <div className="text-xs text-amber-500 mt-1">Ricevuta disponibile</div>}
                  </div>
                  <div className="text-sm text-neutral-500">Dettagli →</div>
                </button>
              ))}
              {expenses.length === 0 && <div className="text-neutral-500">Nessuna spesa</div>}
            </div>

            {/* Table for sm+ */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500"><th>Data</th><th>Categoria</th><th>Importo</th><th>Ricevuta</th><th></th></tr>
                </thead>
                <tbody>
                  {expenses.map((ex:any)=> (
                    <tr key={ex.id} role="button" tabIndex={0} onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setShowExpenseDetail(true); setDetailExpense(ex) }} onKeyDown={(e:any) => { if (e.key === 'Enter') { setShowExpenseDetail(true); setDetailExpense(ex) } }} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer">
                      <td className="py-2">{ex.date}</td>
                      <td>{ex.category}</td>
                      <td>{Number(ex.amount).toFixed(2)} €</td>
                      <td>{ex.receipt_url ? <a href={ex.receipt_url} target="_blank" rel="noreferrer">Ricevuta</a> : '—'}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={(e)=>{ e.stopPropagation(); openEditExpense(ex) }} className="text-sm px-2 py-1 rounded border">Modifica</button>
                          <button onClick={(e)=>{ e.stopPropagation(); deleteExpense(ex.id) }} className="text-sm px-2 py-1 rounded border text-red-600">Elimina</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <Archive start={expenseFilterStart} end={expenseFilterEnd} />
          </div>

          <Modal isOpen={showExpenseModal} onClose={handleCloseExpenseModal} title={editExpense ? 'Modifica Spesa' : 'Aggiungi Spesa'}>
            <form onSubmit={(e)=>{ createExpense(e); setShowExpenseModal(false); }} className="space-y-4">
              <div>
                <Input label="Importo" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Importo" />
              </div>
              <div>
                <Input label="Data" type="date" value={expenseDate} onChange={(e)=>setExpenseDate(e.target.value)} />
              </div>
              <div>
                <Input label="Categoria" value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="Categoria" />
              </div>
              <div>
                <Input label="Note" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Note" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ricevuta (opzionale)</label>
                <input type="file" onChange={(e:any)=>setReceiptFile(e.target.files?.[0]??null)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="submit">{editExpense ? 'Salva Modifiche' : 'Aggiungi spesa'}</Button>
                <button type="button" onClick={() => { setShowExpenseModal(false); setAmount(''); setCategory(''); setNotes(''); setReceiptFile(null); setExpenseDate(new Date().toISOString().slice(0,10)); setEditExpense(null) }} className="px-3 py-1 rounded border">Annulla</button>
              </div>
            </form>
          </Modal>

          {/* Expense detail modal */}
          <Modal isOpen={showExpenseDetail} onClose={() => setShowExpenseDetail(false)} title={detailExpense ? `Spesa ${detailExpense.id}` : 'Dettaglio Spesa'}>
            {detailExpense && (
              <div className="space-y-3">
                <div><strong>Data:</strong> {detailExpense.date}</div>
                <div><strong>Categoria:</strong> {detailExpense.category}</div>
                <div><strong>Importo:</strong> € {Number(detailExpense.amount).toFixed(2)}</div>
                <div><strong>Note:</strong> {detailExpense.notes || '—'}</div>
                <div><strong>Ricevuta:</strong> {detailExpense.receipt_url ? (<a href={detailExpense.receipt_url} target="_blank" rel="noreferrer" className="text-amber-600">Apri ricevuta</a>) : '—'}</div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => { setShowExpenseDetail(false); openEditExpense(detailExpense); }}>Modifica</Button>
                  <button onClick={() => { if (confirm('Eliminare questa spesa?')) { deleteExpense(detailExpense.id); setShowExpenseDetail(false) } }} className="px-3 py-1 rounded border text-red-600">Elimina</button>
                  <button onClick={() => setShowExpenseDetail(false)} className="px-3 py-1 rounded border">Chiudi</button>
                </div>
              </div>
            )}
          </Modal>
        </Card>
      )}
    </div>
  )
}
