import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
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
  const [tab, setTab] = useState<'reports'|'admin'>('reports')
  const [start, setStart] = useState(() => { const d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10) })
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0,10))

  const [revByEquip, setRevByEquip] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
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

  useEffect(() => { loadReports()
    const onSettings = () => loadReports()
    window.addEventListener('settings:changed', onSettings as any)
    return () => window.removeEventListener('settings:changed', onSettings as any)
  }, [])

  async function loadReports() {
    setLoading(true)
    const { data: rev } = await supabase.rpc('report_revenue_by_equipment', { start_date: start, end_date: end })
    setRevByEquip(rev ?? [])
    const { data: d } = await supabase.rpc('report_daily_revenue', { start_date: start, end_date: end })
    setDaily(d ?? [])
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
      const { data: top } = await supabase.rpc('report_top_products', { start_date: start, end_date: end, limit: 10 })
      setTopProducts(top ?? [])
    } catch (e) { setTopProducts([]) }

    setLoading(false)
  }

  async function loadExpenses() {
    const { data } = await supabase.from('expense').select('*').order('date', { ascending: false }).limit(100)
    setExpenses(data ?? [])
  }

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

    const { error } = await supabase.from('expense').insert([{ amount: Number(amount), category, notes, date: new Date().toISOString().slice(0,10), receipt_url }])
    if (error) return alert(error.message)
    setAmount(''); setCategory(''); setNotes(''); setReceiptFile(null)
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
    datasets: [{ label: 'Entrate', data: daily.map((d) => Number(d.revenue)), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)' }]
  }

  const pieData = {
    labels: revByEquip.map((r) => r.equipment),
    datasets: [{ data: revByEquip.map((r) => Number(r.revenue)), backgroundColor: revByEquip.map((_,i)=>['#60a5fa','#3b82f6','#2563eb','#1e3a8a','#93c5fd'][i%5]) }]
  }

  // Chart options that adapt to light/dark theme
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const axisColor = isDark ? '#9CA3AF' : '#374151'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const lineOptions = {
    plugins: { legend: { labels: { color: axisColor } } },
    scales: {
      x: { ticks: { color: axisColor }, grid: { color: gridColor } },
      y: { ticks: { color: axisColor }, grid: { color: gridColor } },
    }
  }

  const pieOptions = { plugins: { legend: { labels: { color: axisColor } } } }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Amministrazione e Report</h2>
        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded ${tab==='reports'? 'bg-brand-500 text-white':'border'}`} onClick={()=>setTab('reports')}>Reports</button>
          <button className={`px-3 py-1 rounded ${tab==='admin'? 'bg-brand-500 text-white':'border'}`} onClick={()=>{ setTab('admin'); loadExpenses() }}>Amministrazione</button>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
        <StatCard title="Entrate" value={(Number(summary.find(s=>s.metric==='revenue')?.value ?? 0)).toFixed(2) + ' €'} />
        <StatCard title="Ordini" value={bookingsCount} />
        <StatCard title="Spese" value={(Number(summary.find(s=>s.metric==='expenses')?.value ?? 0)).toFixed(2) + ' €'} />
        <StatCard title="IVA" value={( (Number(summary.find(s=>s.metric==='revenue')?.value ?? 0) * ivaPercent/100)).toFixed(2) + ' €'} />
        <StatCard title="Profitto" value={(() => { const rev=Number(summary.find(s=>s.metric==='revenue')?.value ?? 0); const exp=Number(summary.find(s=>s.metric==='expenses')?.value ?? 0); const iva=(rev*ivaPercent/100); return (rev - exp - iva).toFixed(2)+' €' })()} />
        <div className="hidden md:block" />
      </div>

      {tab === 'reports' && (
        <>
          <Card>
            <div className="flex gap-2 items-center mb-4">
              <label>Da</label>
              <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="border px-2 py-1 rounded" />
              <label>A</label>
              <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="border px-2 py-1 rounded" />
              <Button onClick={loadReports}>Aggiorna</Button>
              <Button onClick={()=>downloadCSV(revByEquip,'revenue-by-equipment.csv')}>Export CSV</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="mb-4">
                  <div className="text-sm text-neutral-500">Entrate giornaliere</div>
                  <Line data={lineData} options={lineOptions} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Entrate per attrezzatura</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-neutral-500"><th>Attrezzatura</th><th>Prenotazioni</th><th>Incasso</th></tr>
                    </thead>
                    <tbody>
                      {revByEquip.map((r:any)=> (
                        <tr key={r.equipment} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">{r.equipment}</td><td className="py-2">{r.bookings_count}</td><td className="py-2">{Number(r.revenue).toFixed(2)} €</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <div className="text-sm text-neutral-500">Ripartizione entrate</div>
                  <Pie data={pieData} options={pieOptions} />
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
              <div className="text-lg font-medium">Prodotti più richiesti</div>
              <div>
                <Button onClick={()=>downloadCSV(topProducts,'top-products.csv')}>Esporta CSV</Button>
              </div>
            </div>
            <div>
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
          </Card>
        </>
      )}

      {tab === 'admin' && (
        <Card>
          <h3 className="text-lg font-medium mb-3">Gestione Spese</h3>
          <form onSubmit={createExpense} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Importo" className="border px-2 py-1 rounded" />
            <input value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="Categoria" className="border px-2 py-1 rounded" />
            <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Note" className="border px-2 py-1 rounded" />
            <input type="file" onChange={(e:any)=>setReceiptFile(e.target.files?.[0]??null)} className="col-span-1 md:col-span-3" />
            <div className="md:col-span-3 flex gap-2">
              <Button> Aggiungi spesa </Button>
              <Button onClick={loadExpenses} className="bg-gray-600">Ricarica</Button>
            </div>
          </form>

          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500"><th>Data</th><th>Categoria</th><th>Importo</th><th>Ricevuta</th></tr>
              </thead>
              <tbody>
                {expenses.map((ex:any)=> (
                  <tr key={ex.id} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">{ex.date}</td><td>{ex.category}</td><td>{Number(ex.amount).toFixed(2)} €</td><td>{ex.receipt_url ? <a href={ex.receipt_url} target="_blank" rel="noreferrer">Ricevuta</a> : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
