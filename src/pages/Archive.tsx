import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Card from '../components/ui/Card'
import PageTitle from '../components/ui/PageTitle'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'

export default function Archive({ start: propStart, end: propEnd }: { start?: string, end?: string } = {}) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const defaultStart = (() => { const d = new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10) })()
  const defaultEnd = new Date().toISOString().slice(0,10)
  const [start, setStart] = useState<string>(() => propStart ?? defaultStart)
  const [end, setEnd] = useState<string>(() => propEnd ?? defaultEnd)
  const [invoicedFilter, setInvoicedFilter] = useState<'all'|'yes'|'no'>('all')
  const [paidFilter, setPaidFilter] = useState<'all'|'yes'|'no'>('all')
  const [qCustomer, setQCustomer] = useState('')
  const [qInvoice, setQInvoice] = useState('')
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false)

  const [detail, setDetail] = useState<any|null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // load on mount and whenever start/end change
  useEffect(() => { load(); 
    const timer: { id:any } = { id: 0 }
    const onBooking = () => { if (timer.id) clearTimeout(timer.id); timer.id = window.setTimeout(()=> load(), 300) }
    const onExpense = () => { if (timer.id) clearTimeout(timer.id); timer.id = window.setTimeout(()=> load(), 300) }
    window.addEventListener('realtime:booking', onBooking as any)
    window.addEventListener('realtime:expense', onExpense as any)
    return () => { window.removeEventListener('realtime:booking', onBooking as any); window.removeEventListener('realtime:expense', onExpense as any) }
  }, [start, end])

  // Sync parent-provided filter props into the local state so Archive reflects Admin filters
  useEffect(() => { if (propStart !== undefined && propStart !== start) setStart(propStart) }, [propStart])
  useEffect(() => { if (propEnd !== undefined && propEnd !== end) setEnd(propEnd) }, [propEnd])

  async function load() {
    setLoading(true)
    let q: any = supabase.from('booking').select('*').order('start_time', { ascending: false }).limit(1000)
    if (start) q = q.gte('start_time', start + 'T00:00:00')
    if (end) q = q.lte('start_time', end + 'T23:59:59')
    if (invoicedFilter === 'yes') {
      // consider bookings invoiced either by having an invoice number or explicit invoiced flag
      q = q.or('invoiced.eq.true,invoice_number.not.is.null')
    }
    if (invoicedFilter === 'no') {
      // neither invoiced flag nor invoice number
      q = q.not('invoiced','eq',true).is('invoice_number', null)
    }
    if (paidFilter === 'yes') q = q.eq('paid', true)
    if (paidFilter === 'no') q = q.eq('paid', false)
    if (qCustomer) q = q.ilike('customer_name', `%${qCustomer}%`)
    if (qInvoice) q = q.ilike('invoice_number', `%${qInvoice}%`)

    const { data, error } = await q
    if (error) { alert(error.message); setBookings([]); setLoading(false); return }
    setBookings(data ?? [])
    setLoading(false)
  }

  function exportCSV() {
    const rows = bookings.map(b => ({ date: b.start_time, customer: b.customer_name, invoice: b.invoice_number || '', paid: b.paid ? 'yes' : 'no', price: b.price, notes: b.notes }))
    const csv = [Object.keys(rows[0]||{}).join(','), ...rows.map(r => Object.values(r).map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bookings-archive-${start}-${end}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  async function markPaid(id: string) {
    const { error } = await supabase.from('booking').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  // Mark-paid modal state
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [markPaidBookingId, setMarkPaidBookingId] = useState<string | null>(null)
  const [markPaidInvoiced, setMarkPaidInvoiced] = useState<'yes'|'no' | null>(null)
  const [markPaidInvoiceNumber, setMarkPaidInvoiceNumber] = useState<string | null>(null)

  async function confirmMarkPaidArchive() {
    if (!markPaidBookingId || markPaidInvoiced === null) return
    const paidAt = new Date().toISOString()
    const invoiced = markPaidInvoiced === 'yes'
    const payload: any = { paid: true, paid_at: paidAt, invoiced }
    if (invoiced && markPaidInvoiceNumber) payload.invoice_number = markPaidInvoiceNumber
    const { error } = await supabase.from('booking').update(payload).eq('id', markPaidBookingId)
    if (error) return alert(error.message)
    setShowMarkPaidModal(false)
    setMarkPaidBookingId(null)
    setMarkPaidInvoiced(null)
    setMarkPaidInvoiceNumber(null)
    load()
  }

  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(20)
  const total = bookings.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const startIdx = (page - 1) * perPage
  const paginated = bookings.slice(startIdx, startIdx + perPage)

  function exportInvoicesCSV() {
    const rows = bookings.filter(b => b.invoice_number).map(b => ({ date: b.start_time, customer: b.customer_name, invoice: b.invoice_number, price: b.price }))
    if (rows.length === 0) return alert('Nessuna fattura trovata per il filtro')
    const csv = [Object.keys(rows[0]||{}).join(','), ...rows.map(r => Object.values(r).map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `invoices-${start}-${end}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <section>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium m-0">Archivio Prenotazioni</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-300">Cerca fatture e verifica a quali prenotazioni si riferiscono</p>
        </div>
        <div className="flex flex-row gap-2 w-full">
          <Button onClick={exportCSV} className="px-4 py-2">Esporta CSV</Button>
          <Button onClick={exportInvoicesCSV} className="bg-amber-600 px-4 py-2">Esporta fatture</Button>
        </div>
      </div>

      {/* Mobile filters toggle */}
      <div className="sm:hidden mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Filtri</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFiltersMobile(s => !s)} className="px-3 py-1 rounded border text-sm">{showFiltersMobile ? 'Nascondi' : 'Mostra filtri'}</button>
          <button onClick={load} className="px-3 py-1 rounded border bg-gray-600 text-white text-sm">Applica</button>
        </div>
      </div>

      <Card>
        <div className={`${showFiltersMobile ? '' : 'hidden'} sm:block mb-3`}>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm">Da</label>
              <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="border px-2 py-1 rounded w-full max-w-[220px]"/>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">A</label>
              <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="border px-2 py-1 rounded w-full max-w-[220px]"/>
            </div>

            <div className="col-span-2 sm:col-auto">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                <select value={invoicedFilter} onChange={(e)=>setInvoicedFilter(e.target.value as any)} className="w-full border px-2 py-1 rounded">
                  <option value="all">Tutte</option>
                  <option value="yes">Fatturate</option>
                  <option value="no">Non fatturate</option>
                </select>
                <select value={paidFilter} onChange={(e)=>setPaidFilter(e.target.value as any)} className="w-full border px-2 py-1 rounded">
                  <option value="all">Tutti</option>
                  <option value="yes">Pagati</option>
                  <option value="no">Non pagati</option>
                </select>
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input placeholder="Cliente..." value={qCustomer} onChange={(e)=>setQCustomer(e.target.value)} className="border px-2 py-1 rounded w-full" />
              <input placeholder="Nr fattura" value={qInvoice} onChange={(e)=>setQInvoice(e.target.value)} className="border px-2 py-1 rounded w-full" />
            </div>
          </div>
        </div>

        {/* Mobile stacked list */}
      <div className="sm:hidden space-y-2 mb-3">
        {paginated.map(b => (
          <button key={b.id} onClick={()=>{ setDetail(b); setShowDetail(true) }} className="w-full text-left p-3 rounded border bg-white/5 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{b.customer_name}</div>
                <div className="text-xs text-neutral-400">{new Date(b.start_time).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })} • {b.invoice_number ? <span>{b.invoice_number}</span> : '—'}</div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-amber-500 dark:text-amber-300 font-bold">{b.price ? `€ ${Number(b.price).toFixed(2)}` : '—'}</div>
                <div className="text-sm mt-1">
                  {b.paid ? <span className="text-green-600 font-semibold">Pagato</span> : <span className="text-sm text-neutral-500 dark:text-neutral-300">Non pagato</span>}
                  {b.invoiced && <span className="ml-2 text-blue-600 font-semibold">Fatturato</span>}
                </div>
              </div>
            </div>
          </button>
        ))}
        {paginated.length === 0 && <div className="text-neutral-500 dark:text-neutral-300">Nessuna prenotazione</div>}
      </div>

      <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-300"><th>Data</th><th>Cliente</th><th>Fattura</th><th>Prezzo</th><th>Pagato</th><th>Azioni</th></tr>
            </thead>
            <tbody>
              {paginated.map(b => (
                <tr key={b.id} role="button" tabIndex={0} onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setDetail(b); setShowDetail(true) }} onKeyDown={(e:any) => { if (e.key === 'Enter') { setDetail(b); setShowDetail(true) } }} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-white/5 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer">
                  <td className="py-2 lg:py-1">{new Date(b.start_time).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="lg:py-1">{b.customer_name}</td>
                  <td className="lg:py-1">{b.invoice_number ? <span>{b.invoice_number}{b.invoiced ? <span className="text-blue-600 font-semibold"> Fatturata</span> : null}</span> : (b.invoiced ? <span className="text-blue-600 font-semibold">Fatturata</span> : '—')}</td>
                  <td className="lg:py-1 text-amber-500 dark:text-amber-300 font-bold text-right">{b.price ? `€ ${Number(b.price).toFixed(2)}` : '—'}</td>
                  <td className="lg:py-1">{b.paid ? <span className="text-green-600 font-semibold">Pagato</span> : 'No'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={(e)=>{ e.stopPropagation(); setDetail(b); setShowDetail(true) }} className="text-sm px-2 py-1 rounded border">Dettagli</button>
                      {!b.paid && <button onClick={(e)=>{ e.stopPropagation(); setMarkPaidBookingId(b.id); setMarkPaidInvoiced(null); setMarkPaidInvoiceNumber(null); setShowMarkPaidModal(true) }} className="text-sm px-2 py-1 rounded bg-green-600 text-white">Segna pagato</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-neutral-500 dark:text-neutral-300">Mostrando {startIdx+1}–{Math.min(startIdx+perPage, total)} di {total}</div>
          <div className="flex items-center gap-2">
            <select value={perPage} onChange={(e)=>{ setPerPage(Number(e.target.value)); setPage(1); }} className="border px-2 py-1 rounded">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p => Math.max(1, p-1))} className="px-2 py-1 rounded border" aria-label="Pagina precedente" title="Pagina precedente">Prev</button>
              <div className="px-2" aria-live="polite">{page}/{totalPages}</div>
              <button onClick={()=>setPage(p => Math.min(totalPages, p+1))} className="px-2 py-1 rounded border" aria-label="Pagina successiva" title="Pagina successiva">Next</button>
            </div>
          </div>
        </div>
      </Card>

      {/* Mark as paid modal */}
      <Modal mobileCentered isOpen={showMarkPaidModal} onClose={() => { setShowMarkPaidModal(false); setMarkPaidBookingId(null); setMarkPaidInvoiced(null); setMarkPaidInvoiceNumber(null) }} title="Segna come pagato">
        <div className="space-y-4">
          <p>Hai emesso fattura per questa prenotazione?</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setMarkPaidInvoiced('yes')} className={`px-3 py-2 rounded ${markPaidInvoiced === 'yes' ? 'bg-amber-600 text-white' : 'border'}`}>Sì</button>
            <button onClick={() => setMarkPaidInvoiced('no')} className={`px-3 py-2 rounded ${markPaidInvoiced === 'no' ? 'bg-amber-600 text-white' : 'border'}`}>No</button>
          </div>
          {markPaidInvoiced === 'yes' && (
            <div>
              <label className="block text-sm font-medium mb-1">Numero fattura (opzionale)</label>
              <input value={markPaidInvoiceNumber ?? ''} onChange={(e)=>setMarkPaidInvoiceNumber(e.target.value || null)} className="w-full border px-2 py-2 rounded" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setShowMarkPaidModal(false); setMarkPaidBookingId(null); setMarkPaidInvoiced(null); setMarkPaidInvoiceNumber(null) }} className="px-4 py-2 rounded border">Annulla</button>
            <Button onClick={confirmMarkPaidArchive} disabled={markPaidInvoiced === null}>Conferma</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setDetail(null) }} title={detail ? `Prenotazione ${detail.id}` : 'Dettaglio'}>
        {detail && (
          <div className="space-y-3">
            <div><strong>Cliente:</strong> {detail.customer_name}</div>
            <div><strong>Periodo:</strong> {new Date(detail.start_time).toLocaleString('it-IT')} — {new Date(detail.end_time).toLocaleString('it-IT')}</div>
            <div><strong>Prezzo:</strong> {detail.price ? `€ ${Number(detail.price).toFixed(2)}` : '—'}</div>
            <div><strong>Fattura:</strong> {detail.invoice_number ?? '—'}</div>
            <div><strong>Fatturato:</strong> {detail.invoiced ? <span className="text-blue-600 font-semibold">Fatturata</span> : 'No'}</div>
            <div><strong>Pagato:</strong> {detail.paid ? <span className="text-green-600 font-semibold">Pagato</span> : 'No'}</div>
            <div><strong>Note:</strong> {detail.notes ?? '—'}</div>

          </div>
        )}
      </Modal>
    </section>
  )
}
