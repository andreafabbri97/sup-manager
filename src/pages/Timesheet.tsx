import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import PageTitle from '../components/ui/PageTitle'
import { supabase } from '../lib/supabaseClient'

interface EmployeeOption {
  id: string
  name: string
}

interface Shift {
  id: string
  employee_id: string
  start_at: string
  end_at: string
  status: string
  duration_hours: number
  employee?: { name: string; auth_user_id?: string | null }
}

const statusLabels: Record<string, string> = {
  scheduled: 'Programmato',
  completed: 'Completato',
  cancelled: 'Annullato'
}

export default function TimesheetPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<{ employee_id: string; start_at: string; end_at: string; status: string }>({ employee_id: '', start_at: '', end_at: '', status: 'scheduled' })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Shift | null>(null)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadEmployees()
    loadShifts()
    const onShiftsChanged = () => loadShifts()
    window.addEventListener('shifts:changed', onShiftsChanged as any)
    return () => window.removeEventListener('shifts:changed', onShiftsChanged as any)
  }, [])

  async function loadEmployees() {
    const { data, error } = await supabase.from('employees').select('id, name').order('name', { ascending: true })
    if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
    setEmployees(data || [])
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  async function loadShifts() {
    setLoading(true)
    const { data, error } = await supabase.from('shifts').select('id, employee_id, start_at, end_at, status, duration_hours, employees(name, auth_user_id)').order('start_at', { ascending: false }).limit(200)
    setLoading(false)
    if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
    setShifts((data as any) || [])
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const user = (data as any)?.user
        setCurrentUserId(user?.id ?? null)
        const { getCurrentUserRole } = await import('../lib/auth')
        const role = await getCurrentUserRole()
        setIsAdmin(role === 'admin')
      } catch (e) {
        setCurrentUserId(null)
        setIsAdmin(false)
      }
    })()
  }, [])

  function openNew() {
    const now = new Date()
    const later = new Date(now.getTime() + 60 * 60 * 1000)
    setForm({ employee_id: employees[0]?.id || '', start_at: now.toISOString().slice(0,16), end_at: later.toISOString().slice(0,16), status: 'scheduled' })
    setEditing(null)
    setShowModal(true)
  }

  function openEdit(shift: Shift) {
    setEditing(shift)
    setForm({
      employee_id: shift.employee_id,
      start_at: shift.start_at.slice(0,16),
      end_at: shift.end_at.slice(0,16),
      status: shift.status
    })
    setShowModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Seleziona un dipendente', type: 'error' } })); return }
    if (!form.start_at || !form.end_at) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Date obbligatorie', type: 'error' } })); return }
    const start = new Date(form.start_at)
    const end = new Date(form.end_at)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Date non valide', type: 'error' } })); return }
    if (end <= start) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: "La fine deve essere dopo l'\'inizio", type: 'error' } })); return }
    setSaving(true)
    const payload = {
      employee_id: form.employee_id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: form.status
    }

    const { error } = editing
      ? await supabase.from('shifts').update(payload).eq('id', editing.id)
      : await supabase.from('shifts').insert(payload)
    setSaving(false)
    if (error) return alert(error.message)
    setShowModal(false)
    setEditing(null)
    loadShifts()
  }

  async function confirm(id: string) {
    const { error } = await supabase.rpc('confirm_shift', { p_shift_id: id })
    if (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } }))
      return
    }
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Turno confermato', type: 'success' } }))
    loadShifts()
  }

  async function stopShift(id: string) {
    const now = new Date().toISOString()
    const { error } = await supabase.from('shifts').update({ end_at: now }).eq('id', id)
    if (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } }))
      return
    }
    // try to confirm via RPC (may fail if not owner/admin), ignore if RPC errors
    const { error: confErr } = await supabase.rpc('confirm_shift', { p_shift_id: id })
    if (!confErr) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Turno terminato e confermato', type: 'success' } }))
    } else {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Turno terminato', type: 'success' } }))
    }
    loadShifts()
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('shifts').update({ status }).eq('id', id)
    if (error) return alert(error.message)
    loadShifts()
  }

  async function removeShift(id: string) {
    if (!window.confirm('Eliminare questo turno?')) return
    const { error } = await supabase.from('shifts').delete().eq('id', id)
    if (error) return alert(error.message)
    setShifts((prev) => prev.filter((s) => s.id !== id))
  }

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (filterEmployee && s.employee_id !== filterEmployee) return false
      if (filterStatus && s.status !== filterStatus) return false
      return true
    })
  }, [shifts, filterEmployee, filterStatus])

  const grouped = useMemo(() => {
    const byDate: Record<string, Shift[]> = {}
    filteredShifts.forEach((s) => {
      const key = s.start_at ? s.start_at.slice(0,10) : 'sconosciuta'
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(s)
    })
    return byDate
  }, [filteredShifts])

  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageTitle className="m-0">Turni</PageTitle>
        <Button onClick={openNew}>Nuovo turno</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <div className="flex gap-2 flex-1 flex-wrap">
          <select className="border rounded px-3 py-2" value={filterEmployee} onChange={(e)=>setFilterEmployee(e.target.value)}>
            <option value="">Tutti i dipendenti</option>
            {employees.map((e)=>(<option key={e.id} value={e.id}>{e.name}</option>))}
          </select>
          <select className="border rounded px-3 py-2" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
            <option value="">Tutti gli stati</option>
            <option value="scheduled">Programmato</option>
            <option value="completed">Completato</option>
            <option value="cancelled">Annullato</option>
          </select>
        </div>
        <div className="text-xs text-neutral-500">{filteredShifts.length} turni</div>
      </div>

      {loading ? <div className="text-sm text-neutral-500">Caricamento...</div> : null}

      <div className="space-y-4">
        {Object.keys(grouped).length === 0 && !loading && <div className="text-sm text-neutral-500">Nessun turno</div>}
        {Object.entries(grouped).sort((a,b)=>a[0]<b[0]?1:-1).map(([day, list]) => (
          <div key={day} className="space-y-2">
            <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-200">{day}</div>
            {list.map((shift) => (
              <Card key={shift.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold">{shift.employee?.name || 'Dipendente'}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-300">
                    {fmtTime(shift.start_at)} → {fmtTime(shift.end_at)} ({shift.duration_hours?.toFixed(2)} h)
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full ${shift.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200' : shift.status === 'cancelled' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200'}`}>
                      {statusLabels[shift.status] || shift.status}
                    </span>
                    {shift.duration_hours ? <span>{shift.duration_hours.toFixed(2)} h</span> : null}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(shift.status !== 'completed' && (shift.employee?.auth_user_id === currentUserId || isAdmin)) && <Button size="sm" variant="secondary" onClick={()=>confirm(shift.id)}>Conferma</Button>}
                  {(shift.end_at === shift.start_at && (shift.employee?.auth_user_id === currentUserId || isAdmin)) && <Button size="sm" variant="secondary" onClick={()=>stopShift(shift.id)}>Termina</Button>}
                  {shift.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={()=>updateStatus(shift.id, 'cancelled')}>Annulla</Button>}
                  <Button size="sm" variant="secondary" onClick={()=>openEdit(shift)}>Modifica</Button>
                  <Button size="sm" variant="ghost" onClick={()=>removeShift(shift.id)}>Elimina</Button>
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={()=>{ setShowModal(false); setEditing(null) }} title={editing ? 'Modifica turno' : 'Nuovo turno'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Dipendente</label>
            <select className="w-full border rounded px-3 py-2" value={form.employee_id} onChange={(e)=>setForm(f=>({...f, employee_id: e.target.value}))}>
              {employees.map((e)=>(<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1">Inizio</label>
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={form.start_at} onChange={(e)=>setForm(f=>({...f, start_at: e.target.value}))} required />
            </div>
            <div>
              <label className="text-sm block mb-1">Fine</label>
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={form.end_at} onChange={(e)=>setForm(f=>({...f, end_at: e.target.value}))} required />
            </div>
          </div>
          <div>
            <label className="text-sm block mb-1">Stato</label>
            <select className="w-full border rounded px-3 py-2" value={form.status} onChange={(e)=>setForm(f=>({...f, status: e.target.value}))}>
              <option value="scheduled">Programmato</option>
              <option value="completed">Completato</option>
              <option value="cancelled">Annullato</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={()=>setShowModal(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvo...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
