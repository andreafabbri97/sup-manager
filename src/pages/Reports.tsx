import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { Line, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js'
import StatCard from '../components/ui/StatCard'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend)

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
  const [excludeIva, setExcludeIva] = useState(false)
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
    const { data: s } = await supabase.rpc('report_margin', { start_date: start, end_date: end })
    setSummary(s ?? [])

    // load IVA setting
    const { data: setting } = await supabase.from('app_setting').select('value').eq('key','iva_percent').single()
    const ivaVal = setting?.value ? Number(setting.value) : 22
    setIvaPercent(Number.isFinite(ivaVal) ? ivaVal : 22)

    // bookings count
    try {
      const { data: counts } = await supabase.rpc('report_counts', { start_date: start, end_date: end })
      const bc = counts?.find((c:any)=>c.metric==='bookings')?.value ?? 0
      setBookingsCount(Number(bc))
    } catch (e) { setBookingsCount(0) }

    // top products
    try {
      const { data: top } = await supabase.rpc('report_top_products', { start_date: start, end_date: end, p_limit: 10 })
      setTopProducts(top ?? [])
    } catch (e) { setTopProducts([]) }

    setLoading(false)
  }

  async function loadExpenses() {
    const { data } = await supabase.from('expense').select('*').order('date', { ascending: false }).limit(100)
    setExpenses(data ?? [])
  }

  // If tab restored as 'admin' on load, ensure expenses are fetched
  useEffect(() => {
    if (tab === 'admin') loadExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const lineData = {
    labels: daily.map((d) => d.day),
    datasets: [
      { label: 'Entrate', data: daily.map((d) => Number(d.revenue)), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', yAxisID: 'y' }
    ]
  }

  const ordersData = {
    labels: dailyOrders.map((d) => d.day),
    datasets: [ { label: 'Ordini', data: dailyOrders.map((d) => Number(d.orders ?? d.count ?? 0)), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.2)' } ]
  }

  const pieData = {
    labels: revByEquip.map((r) => r.equipment),
    datasets: [{ data: revByEquip.map((r) => Number(r.revenue)), backgroundColor: revByEquip.map((_,i)=>['#60a5fa','#3b82f6','#2563eb','#1e3a8a','#93c5fd'][i%5]) }]
  }

  // Chart options that adapt to light/dark theme and are responsive
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const axisColor = isDark ? '#9CA3AF' : '#374151'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: axisColor }, position: isSmall ? 'bottom' : 'top' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || ''
            const val = ctx.parsed?.y ?? ctx.parsed ?? 0
            if (ctx.dataset.yAxisID === 'y') return `${label}: ${Number(val).toFixed(2)} €`
            return `${label}: ${Number(val).toFixed(0)}`
          }
        }
      }
    },
    elements: { point: { radius: 3 } },
    scales: {
      x: { ticks: { color: axisColor }, grid: { color: gridColor } },
      y: { ticks: { color: axisColor, callback: (v: any) => `${Number(v).toFixed(0)} €` }, grid: { color: gridColor }, position: 'left' },
      y1: { ticks: { color: axisColor, callback: (v: any) => `${Number(v).toFixed(0)}` }, grid: { display: false }, position: 'right' }
    }
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: axisColor }, position: isSmall ? 'bottom' : 'right' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${Number(ctx.raw ?? 0).toFixed(2)} €`
        }
      }
    }
  }

  // derive profit value using excludeIva toggle (when excluded, IVA is zeroed)
  const revenueSum = Number(summary.find(s=>s.metric==='revenue')?.value ?? 0)
  const revenueInvoiced = Number(summary.find(s=>s.metric==='revenue_invoiced')?.value ?? 0)
  const expensesSum = Number(summary.find(s=>s.metric==='expenses')?.value ?? 0)
  const ivaAmount = excludeIva ? 0 : (revenueInvoiced * ivaPercent/100)
  const profitValue = (revenueSum - expensesSum - ivaAmount).toFixed(2) + ' €'

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap">
        <h2 className="text-2xl font-semibold">Amministrazione e Report</h2>
        <div className="flex items-center gap-4">
          <div role="tablist" aria-label="Sezioni report" className="inline-flex rounded bg-neutral-100 dark:bg-neutral-800 p-1">
            <button role="tab" aria-selected={tab==='reports'} onClick={()=>setTab('reports')} className={`px-3 py-1 rounded ${tab==='reports' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Reports</button>
            <button role="tab" aria-selected={tab==='admin'} onClick={()=>{ setTab('admin'); loadExpenses() }} className={`px-3 py-1 rounded ${tab==='admin' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Amministrazione</button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={excludeIva} onChange={(e)=>setExcludeIva(e.target.checked)} className="border rounded" />
            Escludi IVA
          </label>
        </div>
      </div>

      {/* Top metrics (mobile scrollable) */}
      <div className="mb-4">
          <div className="flex flex-wrap gap-4 pb-2">
          <StatCard title="Entrate" value={revenueSum.toFixed(2) + ' €'} color="accent" />
          <StatCard title="Ordini" value={bookingsCount} color="neutral" />
          <StatCard title="Spese" value={expensesSum.toFixed(2) + ' €'} color="warning" />
          {!excludeIva && <StatCard title="IVA" value={(ivaAmount).toFixed(2) + ' €'} color="neutral" />}
          <StatCard title="Profitto" value={profitValue} color="success" />
        </div>
      </div>

      {tab === 'reports' && (
        <>
          <Card>
            <div className="mb-4">
            <div className="flex gap-2 items-center flex-wrap">
              <label>Da</label>
              <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="border px-2 py-1 rounded" />
              <label>A</label>
              <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="border px-2 py-1 rounded" />
              <Button onClick={loadReports}>Aggiorna</Button>
              <Button onClick={()=>downloadCSV(revByEquip,'revenue-by-equipment.csv')}>Export CSV</Button>
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="mb-4">
                  <div className="text-sm text-neutral-500">Ordini giornalieri</div>
                  <div className="h-40 sm:h-48"><div className="h-full"><Line data={ordersData} options={lineOptions} /></div></div>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-neutral-500">Entrate giornaliere</div>
                  <div className="h-40 sm:h-48"><div className="h-full"><Line data={lineData} options={lineOptions} /></div></div>
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
                      <div key={r.equipment} className="p-3 rounded border bg-white/5 dark:bg-slate-800 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{r.equipment}</div>
                          <div className="text-sm text-neutral-500">{Number(r.revenue).toFixed(2)} €</div>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">Prenotazioni: {r.bookings_count}</div>
                      </div>
                    ))}
                    {revByEquip.length === 0 && <div className="text-neutral-500">Nessuna entrata</div>}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <div className="text-sm text-neutral-500">Ripartizione entrate</div>
                  <div className="h-40 sm:h-48"><div className="h-full"><Pie data={pieData} options={pieOptions} /></div></div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Riepilogo</div>
                  <ul className="mt-2">
                    {summary.map((s:any)=> (
                      <li key={s.metric} className="py-1"><strong>{s.metric}</strong>: {Number(s.value).toFixed(2)} €</li>
                    ))}
                  </ul>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium">Gestione Spese</h3>
            <div className="flex gap-2">
                <Button onClick={() => { setEditExpense(null); setExpenseDate(new Date().toISOString().slice(0,10)); setShowExpenseModal(true) }}>Aggiungi spesa</Button>
                <Button onClick={loadExpenses} className="bg-gray-600">Ricarica</Button>
              </div>
          </div>

          <div className="mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500"><th>Data</th><th>Categoria</th><th>Importo</th><th>Ricevuta</th><th></th></tr>
              </thead>
              <tbody>
                {expenses.map((ex:any)=> (
                  <tr key={ex.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="py-2">{ex.date}</td>
                    <td>{ex.category}</td>
                    <td>{Number(ex.amount).toFixed(2)} €</td>
                    <td>{ex.receipt_url ? <a href={ex.receipt_url} target="_blank" rel="noreferrer">Ricevuta</a> : '—'}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button onClick={()=>openEditExpense(ex)} className="text-sm px-2 py-1 rounded border">Modifica</button>
                        <button onClick={()=>deleteExpense(ex.id)} className="text-sm px-2 py-1 rounded border text-red-600">Elimina</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal isOpen={showExpenseModal} onClose={handleCloseExpenseModal} title="Aggiungi Spesa">
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
                <Button type="submit">Aggiungi spesa</Button>
                <button type="button" onClick={() => { setShowExpenseModal(false); setAmount(''); setCategory(''); setNotes(''); setReceiptFile(null); setExpenseDate(new Date().toISOString().slice(0,10)) }} className="px-3 py-1 rounded border">Annulla</button>
              </div>
            </form>
          </Modal>
        </Card>
      )}
    </div>
  )
}
