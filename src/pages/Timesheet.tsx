import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import PageTitle from '../components/ui/PageTitle'
import { supabase } from '../lib/supabaseClient'
import { formatDatePretty } from '../lib/format'

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
  approval_status?: string | null
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
  const [startDate, setStartDate] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10) })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0,10))

  useEffect(() => {
    loadEmployees()
    loadShifts()
    const onShiftsChanged = () => loadShifts()
    const onRealtime = () => loadShifts()
    window.addEventListener('shifts:changed', onShiftsChanged as any)
    window.addEventListener('realtime:shifts', onRealtime as any)
    return () => { window.removeEventListener('shifts:changed', onShiftsChanged as any); window.removeEventListener('realtime:shifts', onRealtime as any) }
  }, [])

  // reload when date range changes
  useEffect(() => {
    loadShifts()
  }, [startDate, endDate])

  async function loadEmployees() {
    const { data, error } = await supabase.from('employees').select('id, name').order('name', { ascending: true })
    if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
    setEmployees(data || [])
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [staffEmployeeId, setStaffEmployeeId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const user = (data as any)?.user
        setCurrentUserId(user?.id ?? null)
        const { getCurrentUserRole, getCurrentUserId } = await import('../lib/auth')
        const r = await getCurrentUserRole()
        setRole(r)
        setIsAdmin(r === 'admin')
        if (r === 'staff') {
          const uid = await getCurrentUserId()
          if (uid) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_user_id', uid).maybeSingle()
            if (emp && (emp as any).id) setStaffEmployeeId((emp as any).id)
          }
        }
      } catch (e) {
        setCurrentUserId(null)
        setIsAdmin(false)
      }
    })()
  }, [])

  async function loadShifts() {
    setLoading(true)
    try {
      const { getCurrentUserRole, getCurrentUserId } = await import('../lib/auth')
      const role = await getCurrentUserRole()
      const uid = await getCurrentUserId()

      // If staff, show only their shifts (if associated employee exists)
      if (role === 'staff') {
        if (!uid) { setShifts([]); setLoading(false); return }
        const { data: emp } = await supabase.from('employees').select('id').eq('auth_user_id', uid).single()
        if (!emp || !emp.id) { setShifts([]); setLoading(false); return }
        let q = supabase.from('shifts').select('id, employee_id, start_at, end_at, status, duration_hours, approval_status, employees(name, auth_user_id)').eq('employee_id', emp.id)
        if (startDate) q = q.gte('start_at', `${startDate}T00:00:00`)
        if (endDate) q = q.lte('start_at', `${endDate}T23:59:59`)
        const { data, error } = await q.order('start_at', { ascending: false }).limit(200)
        setLoading(false)
        if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
        setShifts((data as any) || [])
        return
      }

      // admin/other roles: load wide view
      let q = supabase.from('shifts').select('id, employee_id, start_at, end_at, status, duration_hours, approval_status, employees(name, auth_user_id)')
      if (startDate) q = q.gte('start_at', `${startDate}T00:00:00`)
      if (endDate) q = q.lte('start_at', `${endDate}T23:59:59`)
      const { data, error } = await q.order('start_at', { ascending: false }).limit(200)
      setLoading(false)
      if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
      setShifts((data as any) || [])
    } catch (e: any) {
      setLoading(false)
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: e.message || 'Errore caricamento turni', type: 'error' } }))
    }
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

    // If staff, force employee to their own employee id and prevent if missing
    if (role === 'staff') {
      if (!staffEmployeeId) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Il tuo account non è associato ad un dipendente; contatta un admin.', type: 'error' } }))
        return
      }
      setForm({ employee_id: staffEmployeeId, start_at: fmtLocalInput(now), end_at: fmtLocalInput(later), status: 'scheduled' })
    } else {
      setForm({ employee_id: employees[0]?.id || '', start_at: fmtLocalInput(now), end_at: fmtLocalInput(later), status: 'scheduled' })
    }

    setEditing(null)
    setShowModal(true)
  }

  function openEdit(shift: Shift) {
    setEditing(shift)
    setForm({
      employee_id: shift.employee_id,
      start_at: fmtLocalInput(new Date(shift.start_at)),
      end_at: fmtLocalInput(new Date(shift.end_at)),
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

    // If staff, force status to 'scheduled' regardless of form input
    const forcedStatus = role === 'staff' ? 'scheduled' : form.status

    const payload = {
      employee_id: form.employee_id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: forcedStatus
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
    // pass internal app session token when present so server-side ownership checks succeed
    const token = (() => {
      try { return window.localStorage.getItem('app_session_token') } catch (e) { return null }
    })()
    const payload: any = { p_shift_id: id }
    if (token) payload.p_session_token = token

    const { error } = await supabase.rpc('confirm_shift', payload)
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
    const token = (() => {
      try { return window.localStorage.getItem('app_session_token') } catch (e) { return null }
    })()
    const payload: any = { p_shift_id: id }
    if (token) payload.p_session_token = token
    const { error: confErr } = await supabase.rpc('confirm_shift', payload)
    if (!confErr) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Turno terminato e confermato', type: 'success' } }))
    } else {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Turno terminato', type: 'success' } }))
    }
    loadShifts()
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('shifts').update({ status }).eq('id', id)
    if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
    loadShifts()
  }

  async function approve(id: string, action: 'approved' | 'rejected') {
    try {
      const { approveShift } = await import('../lib/shifts')
      await approveShift(id, action)
      // Ensure an explicit row update to trigger realtime notifications reliably
      try {
        await supabase.from('shifts').update({ approval_status: action, updated_at: new Date().toISOString() }).eq('id', id)
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: action === 'approved' ? 'Turno approvato' : 'Turno rifiutato', type: 'success' } }))
      loadShifts()
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: e.message || 'Errore approvazione', type: 'error' } }))
    }
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

  const fmtLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const fmtDayDisplay = (isoDay: string) => {
    if (!isoDay || isoDay === 'sconosciuta') return 'sconosciuta'
    return formatDatePretty(isoDay)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageTitle className="m-0">Turni</PageTitle>
        <Button onClick={openNew}>Nuovo turno</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <div className="flex gap-2 flex-1 flex-wrap items-end">
        <div>
          <label className="text-sm block mb-1">Da</label>
          <input type="date" className="border rounded px-3 py-2" value={startDate} onChange={(e)=>{ setStartDate(e.target.value) }} />
        </div>
        <div>
          <label className="text-sm block mb-1">A</label>
          <input type="date" className="border rounded px-3 py-2" value={endDate} onChange={(e)=>{ setEndDate(e.target.value) }} />
        </div>
        {role !== 'staff' && (
          <>
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
          </>
        )}
      </div>
        <div className="text-xs text-neutral-500">{filteredShifts.length} turni</div>
      </div>

      {loading ? <div className="text-sm text-neutral-500">Caricamento...</div> : null}

      <div className="space-y-4">
        {Object.keys(grouped).length === 0 && !loading && <div className="text-sm text-neutral-500">Nessun turno</div>}
        {Object.entries(grouped).sort((a,b)=>a[0]<b[0]?1:-1).map(([day, list]) => (
          <div key={day} className="space-y-2">
            <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-200">{fmtDayDisplay(day)}</div>
            {list.map((shift) => (
              <Card key={shift.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  {/* show actual employee name if available, fallback to lookup by id, otherwise a short dash */}
                  <div className="font-semibold">{shift.employee?.name || employees.find(e => e.id === shift.employee_id)?.name || '—'}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-300">
                    {fmtTime(shift.start_at)} → {fmtTime(shift.end_at)} ({shift.duration_hours?.toFixed(2)} h)
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full ${shift.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200' : shift.status === 'cancelled' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200'}`}>
                      {statusLabels[shift.status] || shift.status}
                    </span>
                    {shift.duration_hours ? <span>{shift.duration_hours.toFixed(2)} h</span> : null}

                    {/* For staff: show approval badge next to hours */}
                    {role === 'staff' && shift.approval_status === 'approved' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">Approvato</span>
                    )}
                    {role === 'staff' && shift.approval_status === 'rejected' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">Rifiutato</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Determine ownership once */}
                  {(shift.employee?.auth_user_id === currentUserId) && (
                    <> {/* Owner actions (staff) */}
                      {shift.status !== 'completed' && (shift.end_at === shift.start_at ? (
                        <Button size="sm" variant="secondary" onClick={()=>stopShift(shift.id)}>Termina</Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={()=>confirm(shift.id)}>Conferma</Button>
                      ))}
                      <Button size="sm" variant="secondary" onClick={()=>openEdit(shift)}>Modifica</Button>
                      <Button size="sm" variant="ghost" onClick={()=>removeShift(shift.id)}>Elimina</Button>
                    </>
                  )}

                  {/* Admin actions */}
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="secondary" onClick={()=>openEdit(shift)}>Modifica</Button>
                      <Button size="sm" variant="ghost" onClick={()=>removeShift(shift.id)}>Elimina</Button>
                      {shift.approval_status === 'approved' ? (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">Approvato</span>
                          <Button size="sm" variant="ghost" onClick={() => approve(shift.id, 'rejected')}>Rifiuta</Button>
                        </>
                      ) : shift.approval_status === 'rejected' ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => approve(shift.id, 'approved')}>Approva</Button>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">Rifiutato</span>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => approve(shift.id, 'approved')}>Approva</Button>
                          <Button size="sm" variant="ghost" onClick={() => approve(shift.id, 'rejected')}>Rifiuta</Button>
                        </>
                      )}
                    </>
                  )}
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
            {role === 'staff' ? (
              <div className="px-3 py-2 border rounded bg-neutral-50">{employees.find(e => e.id === staffEmployeeId)?.name || '—'}</div>
            ) : (
              <select className="w-full border rounded px-3 py-2" value={form.employee_id} onChange={(e)=>setForm(f=>({...f, employee_id: e.target.value}))}>
                {employees.map((e)=>(<option key={e.id} value={e.id}>{e.name}</option>))}
              </select>
            )}
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
            {role === 'staff' ? (
              <div className="px-3 py-2 border rounded bg-neutral-50">Programmato</div>
            ) : (
              <select className="w-full border rounded px-3 py-2" value={form.status} onChange={(e)=>setForm(f=>({...f, status: e.target.value}))}>
                <option value="scheduled">Programmato</option>
                <option value="completed">Completato</option>
                <option value="cancelled">Annullato</option>
              </select>
            )}
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
