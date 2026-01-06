import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import PageTitle from '../components/ui/PageTitle'
import { supabase } from '../lib/supabaseClient'

interface Employee {
  id: string
  name: string
  hourly_rate: number
  auth_user_id?: string | null
  tax_id?: string | null
  payment_method?: string | null
  notes?: string | null
}

const emptyEmployee: Employee = {
  id: '',
  name: '',
  hourly_rate: 0,
  auth_user_id: '',
  tax_id: '',
  payment_method: '',
  notes: ''
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState<Employee>(emptyEmployee)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('employees').select('*').order('name', { ascending: true })
    setLoading(false)
    if (error) {
      alert(error.message)
      return
    }
    setEmployees((data || []) as any)
  }

  function openNew() {
    setEditing(null)
    setForm({ ...emptyEmployee, id: '' })
    setShowModal(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setForm({ ...emp })
    setShowModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return alert('Nome obbligatorio')
    if (!Number.isFinite(form.hourly_rate)) return alert('Tariffa oraria non valida')
    setSaving(true)
    const payload: any = {
      id: form.id || undefined,
      name: form.name.trim(),
      hourly_rate: Number(form.hourly_rate) || 0,
      auth_user_id: form.auth_user_id || null,
      tax_id: form.tax_id || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null
    }
    const { error } = await supabase.from('employees').upsert(payload)
    setSaving(false)
    if (error) return alert(error.message)
    setShowModal(false)
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('Eliminare questo dipendente?')) return
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) return alert(error.message)
    setEmployees((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageTitle className="m-0">Dipendenti</PageTitle>
        <Button onClick={openNew}>Nuovo dipendente</Button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500">Caricamento...</div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {employees.map((emp) => (
            <Card key={emp.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="font-semibold text-lg">{emp.name}</div>
                <div className="text-sm text-amber-500 font-semibold">{emp.hourly_rate?.toFixed(2)} € / ora</div>
                <div className="text-xs text-neutral-500 mt-1 flex flex-col sm:flex-row sm:gap-3">
                  {emp.auth_user_id ? <span>Auth user: {emp.auth_user_id}</span> : <span>Auth user: —</span>}
                  {emp.tax_id ? <span>Cod. fiscale/IVA: {emp.tax_id}</span> : <span>Cod. fiscale/IVA: —</span>}
                  {emp.payment_method ? <span>Pagamento: {emp.payment_method}</span> : <span>Pagamento: —</span>}
                </div>
                {emp.notes && <div className="text-sm mt-1 text-neutral-600 dark:text-neutral-300">{emp.notes}</div>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="secondary" onClick={() => openEdit(emp)}>Modifica</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(emp.id)}>Elimina</Button>
              </div>
            </Card>
          ))}
          {employees.length === 0 && <div className="text-sm text-neutral-500">Nessun dipendente</div>}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifica dipendente' : 'Nuovo dipendente'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Nome*</label>
            <input className="w-full border rounded px-3 py-2" value={form.name} onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Tariffa oraria (€)*</label>
            <input type="number" step="0.01" className="w-full border rounded px-3 py-2" value={form.hourly_rate} onChange={(e)=>setForm(f=>({...f, hourly_rate: Number(e.target.value)}))} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1">Auth user ID (opzionale)</label>
              <input className="w-full border rounded px-3 py-2" value={form.auth_user_id ?? ''} onChange={(e)=>setForm(f=>({...f, auth_user_id: e.target.value}))} placeholder="UUID utente" />
            </div>
            <div>
              <label className="text-sm block mb-1">Cod. fiscale / IVA (opzionale)</label>
              <input className="w-full border rounded px-3 py-2" value={form.tax_id ?? ''} onChange={(e)=>setForm(f=>({...f, tax_id: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="text-sm block mb-1">Metodo di pagamento (opzionale)</label>
            <input className="w-full border rounded px-3 py-2" value={form.payment_method ?? ''} onChange={(e)=>setForm(f=>({...f, payment_method: e.target.value}))} placeholder="es. Bonifico, contanti" />
          </div>
          <div>
            <label className="text-sm block mb-1">Note</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={form.notes ?? ''} onChange={(e)=>setForm(f=>({...f, notes: e.target.value}))} />
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
