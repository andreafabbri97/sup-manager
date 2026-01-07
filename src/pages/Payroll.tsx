import React, { useEffect, useState } from 'react'
import PageTitle from '../components/ui/PageTitle'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { calculatePayroll, createPayrollRun, createExpensesFromPayrollRun } from '../lib/payroll'
import { supabase } from '../lib/supabaseClient'

export default function PayrollPage() {
  const [start, setStart] = useState<string>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [employeeId, setEmployeeId] = useState('')
  const [employees, setEmployees] = useState<{id:string;name:string}[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [lastRunId, setLastRunId] = useState<string | null>(null)
  const [creatingExpenses, setCreatingExpenses] = useState(false)
  const [expensesCreated, setExpensesCreated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => { loadEmployees() }, [])
  useEffect(() => {
    import('../lib/auth').then(({ getCurrentUserRole }) => getCurrentUserRole().then(r => setIsAdmin(r === 'admin')))
    const onAuth = () => import('../lib/auth').then(({ getCurrentUserRole }) => getCurrentUserRole().then(r => setIsAdmin(r === 'admin')))
    window.addEventListener('auth:changed', onAuth as any)
    return () => window.removeEventListener('auth:changed', onAuth as any)
  }, [])

  async function loadEmployees() {
    const { data, error } = await supabase.from('employees').select('id, name').order('name')
    if (error) return
    setEmployees(data || [])
  }

  async function onCalculate() {
    setLoading(true)
    try {
      const res = await calculatePayroll(start, end, employeeId || undefined)
      setResult(res)
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: e.message || 'Errore calcolo paga', type: 'error' } }))
    }
    setLoading(false)
  }

  async function onCreateRun() {
    if (!window.confirm('Creare una payroll run per questo periodo?')) return
    setCreating(true)
    try {
      const data = await createPayrollRun(start, end, undefined, undefined)
      // RPC returns run id as first row or a scalar depending on DB; normalize
      const runId = Array.isArray(data) ? (data[0]?.payroll_run_id || data[0]?.id) : (data?.payroll_run_id || data?.id)
      if (runId) {
        setLastRunId(runId)
        setExpensesCreated(false)
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Payroll run creata', type: 'success' } }))
      } else {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Run creata (nessun id restituito)', type: 'success' } }))
      }
      setResult(null)
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: e.message || 'Errore creazione run', type: 'error' } }))
    }
    setCreating(false)
  }

  async function onCreateExpenses(runId: string) {
    if (creatingExpenses) return
    setCreatingExpenses(true)
    try {
      await createExpensesFromPayrollRun(runId)
      setExpensesCreated(true)
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Spese create', type: 'success' } }))
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: e.message || 'Errore creazione spese', type: 'error' } }))
    }
    setCreatingExpenses(false)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div>
        <PageTitle className="m-0">Paghe</PageTitle>
        <div className="text-xs text-neutral-500 mt-2 mb-4">Calcola e crea payroll run</div>
      </div>

      {!isAdmin ? (
        <Card>
          <div className="text-sm text-neutral-500">Accesso riservato agli amministratori. Se sei un admin, accedi e ricarica la pagina per gestire le paghe.</div>
        </Card>
      ) : (
        <>
          <Card className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-sm block mb-1">Periodo inizio</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={start} onChange={(e)=>setStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm block mb-1">Periodo fine</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={end} onChange={(e)=>setEnd(e.target.value)} />
              </div>
              <div>
                <label className="text-sm block mb-1">Dipendente (opzionale)</label>
                <select className="w-full border rounded px-3 py-2" value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)}>
                  <option value="">Tutti i dipendenti</option>
                  {employees.map(e=> (<option key={e.id} value={e.id}>{e.name}</option>))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={onCalculate} disabled={loading}>{loading? 'Calcolo...' : 'Calcola'}</Button>
                <Button variant="secondary" disabled={creating} onClick={onCreateRun}>{creating? 'Creazione...' : 'Crea payroll run'}</Button>
              </div>
            </div>
          </Card>

          {result && (
            <Card className="p-4 sm:p-6 mt-4">
              <div className="font-semibold mb-2">Risultati</div>
              <div className="text-sm text-neutral-600">Totale ore: {result?.totals?.total_hours ?? 0}</div>
              <div className="text-sm text-neutral-600 mb-2">Totale importo: {result?.totals?.total_amount ?? 0} €</div>
              <div className="grid gap-2">
                {result?.items && result.items.map((it: any) => (
                  <div key={it.shift_id} className="p-2 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{it.employee_name}</div>
                      <div className="text-xs">{new Date(it.start_at).toLocaleString('it-IT')} → {new Date(it.end_at).toLocaleString('it-IT')}</div>
                      <div className="text-xs">Ore: {it.duration_hours} → Pagate: {it.hours_paid} @ {it.rate}€</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{it.amount} €</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {lastRunId && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm">Ultima payroll run: {lastRunId}</div>
                <div className="flex gap-2">
                  <Button onClick={()=>onCreateExpenses(lastRunId!)} disabled={creatingExpenses || expensesCreated}>{creatingExpenses ? 'Creazione...' : expensesCreated ? 'Spese create' : 'Aggiungi paghe alle spese'}</Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

    </div>
  )
}
