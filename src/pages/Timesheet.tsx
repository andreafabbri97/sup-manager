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
  employee?: { name: string }
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

  useEffect(() => {
    loadEmployees()
    loadShifts()
  }, [])

  async function loadEmployees() {
    const { data, error } = await supabase.from('employees').select('id, name').order('name', { ascending: true })
    if (error) { alert(error.message); return }
    setEmployees(data || [])
  }

  async function loadShifts() {
    setLoading(true)
    const { data, error } = await supabase.from('shifts').select('id, employee_id, start_at, end_at, status, duration_hours, employees(name)').order('start_at', { ascending: false }).limit(200)
    setLoading(false)
    if (error) { alert(error.message); return }
    setShifts((data as any) || [])
  }

  function openNew() {
    const now = new Date()
    const later = new Date(now.getTime() + 60 * 60 * 1000)
    setForm({ employee_id: employees[0]?.id || '', start_at: now.toISOString().slice(0,16), end_at: later.toISOString().slice(0,16), status: 'scheduled' })
    setShowModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id) return alert('Seleziona un dipendente')
    if (!form.start_at || !form.end_at) return alert('Date obbligatorie')
    setSaving(true)
    const { error } = await supabase.from('shifts').insert({
      employee_id: form.employee_id,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
      status: form.status
    })
    setSaving(false)
    if (error) return alert(error.message)
    setShowModal(false)
    loadShifts()
  }

  async function confirm(id: string) {
    const { error } = await supabase.rpc('confirm_shift', { p_shift_id: id })
    if (error) return alert(error.message)
    loadShifts()
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('shifts').update({ status }).eq('id', id)
    if (error) return alert(error.message)
    loadShifts()
  }

  const grouped = useMemo(() => {
    const byDate: Record<string, Shift[]> = {}
    shifts.forEach((s) => {
      const key = s.start_at ? s.start_at.slice(0,10) : 'sconosciuta'
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(s)
    })
    return byDate
  }, [shifts])

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
                  <div className="text-xs text-neutral-500">{statusLabels[shift.status] || shift.status}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {shift.status !== 'completed' && <Button size="sm" variant="secondary" onClick={()=>confirm(shift.id)}>Conferma</Button>}
                  {shift.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={()=>updateStatus(shift.id, 'cancelled')}>Annulla</Button>}
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Nuovo turno">
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
