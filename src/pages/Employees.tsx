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
  const [search, setSearch] = useState('')
  const [roleMsg, setRoleMsg] = useState('')
  const [roles, setRoles] = useState<Record<string, string>>({})
  const [availableUsers, setAvailableUsers] = useState<{id: string; username?: string; role: string}[]>([])
  const [usersById, setUsersById] = useState<Record<string,string>>({})
  const [authWarning, setAuthWarning] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    import('../lib/auth').then(({ getCurrentUserRole }) => {
      getCurrentUserRole().then(r => { if (mounted) setIsAdmin(r === 'admin') })
    })
    const onAuthChanged = () => {
      import('../lib/auth').then(({ getCurrentUserRole }) => getCurrentUserRole().then(r => setIsAdmin(r === 'admin')))
    }
    window.addEventListener('auth:changed', onAuthChanged as any)
    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged as any) }
  }, [])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('employees').select('*').order('name', { ascending: true })
    setLoading(false)
    if (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } }))
      return
    }
    const list = (data || []) as any as Employee[]
    setEmployees(list)
    const authIds = list.map((e) => e.auth_user_id).filter(Boolean) as string[]
    if (authIds.length) {
      const { data: rolesData } = await supabase.from('app_user').select('id, role').in('id', authIds)
      const map: Record<string, string> = {}
      rolesData?.forEach((r: any) => { if (r?.id) map[r.id] = r.role })
      setRoles(map)
    } else {
      setRoles({})
    }

  }

  async function loadUsers() {
    const { data } = await supabase.from('app_user').select('id, username, role').order('username')
    const users = (data as any) || []
    setAvailableUsers(users)
    const map: Record<string,string> = {}
    users.forEach((u: any) => { if (u?.id && u?.username) map[u.id] = u.username })
    setUsersById(map)
  }

  useEffect(() => {
    loadUsers()
    const onAuthChanged = () => { load(); loadUsers() }
    window.addEventListener('auth:changed', onAuthChanged)
    return () => window.removeEventListener('auth:changed', onAuthChanged)
  }, [])

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
    if (!form.name.trim()) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Nome obbligatorio', type: 'error' } })); return }
    if (!Number.isFinite(form.hourly_rate) || form.hourly_rate < 0) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Tariffa oraria non valida', type: 'error' } })); return }
    setSaving(true)
    const payload: any = {
      id: form.id || undefined,
      name: form.name.trim(),
      hourly_rate: Number(form.hourly_rate) || 0,
      tax_id: form.tax_id || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null
    }
    // only include auth_user_id if provided (avoid Supabase error when column missing)
    if (form.auth_user_id && String(form.auth_user_id).trim()) {
      payload.auth_user_id = String(form.auth_user_id).trim()
    }

    const { error } = await supabase.from('employees').upsert(payload)
    setSaving(false)
    if (error) {
      // Provide a helpful message if the column is missing in the DB schema
      if (typeof error.message === 'string' && error.message.includes("Could not find the 'auth_user_id'")) {
        return window.dispatchEvent(new CustomEvent('toast', { detail: { message: "Il database non sembra avere la colonna 'auth_user_id' nella tabella 'employees'. Esegui la migration per aggiungerla (vedi db/migrations). Nel frattempo lascia il campo vuoto per evitare errori.", type: 'error' } }))
      }
      return window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } }))
    }

    setShowModal(false)
    load()
  }

  async function setRole(emp: Employee, role: 'admin' | 'staff') {
    if (!emp.auth_user_id) {
      alert('Per assegnare un ruolo serve un auth_user_id sul dipendente.')
      return
    }
    const { error } = await supabase.from('app_user').upsert({ id: emp.auth_user_id, role })
    if (error) return alert(error.message)
    setRoles((prev) => ({ ...prev, [emp.auth_user_id!]: role }))
    setRoleMsg(`Ruolo impostato su ${role} per ${emp.name}`)
    setTimeout(() => setRoleMsg(''), 2500)
  }

  async function remove(id: string) {
    if (!window.confirm('Eliminare questo dipendente?')) return
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } }))
      return
    }
    setEmployees((prev) => prev.filter((e) => e.id !== id))
  }

  async function startShift(emp: Employee) {
    const now = new Date().toISOString()
    const { error } = await supabase.from('shifts').insert({ employee_id: emp.id, start_at: now, end_at: now, status: 'scheduled' })
    if (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } }))
      return
    }
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: `Turno iniziato per ${emp.name}`, type: 'success' } }))
    window.dispatchEvent(new CustomEvent('shifts:changed'))
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageTitle className="m-0">Dipendenti</PageTitle>
        <Button onClick={openNew}>Nuovo dipendente</Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1">
          <input
            className="w-full sm:w-72 border rounded px-3 py-2"
            placeholder="Cerca per nome"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
          {roleMsg && <span className="text-xs text-emerald-600">{roleMsg}</span>}
        </div>
        <div className="text-xs text-neutral-500">{employees.length} dipendenti</div>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500">Caricamento...</div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {employees
            .filter((emp) => emp.name.toLowerCase().includes(search.toLowerCase()))
            .map((emp) => (
            <Card key={emp.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="font-semibold text-lg">{emp.name}</div>
                <div className="text-sm text-amber-500 font-semibold">{emp.hourly_rate?.toFixed(2)} € / ora</div>
                <div className="text-xs text-neutral-500 mt-1 flex flex-col sm:flex-row sm:gap-3">
                  {emp.auth_user_id ? <span className="text-emerald-600 dark:text-emerald-400">Auth user: {usersById[emp.auth_user_id] || emp.auth_user_id}</span> : <span>Auth user: —</span>}
                  {emp.tax_id ? <span>Cod. fiscale/IVA: {emp.tax_id}</span> : <span>Cod. fiscale/IVA: —</span>}
                  {emp.payment_method ? <span>Pagamento: {emp.payment_method}</span> : <span>Pagamento: —</span>}
                </div>
                {emp.auth_user_id && roles[emp.auth_user_id] && (
                  <div className="text-xs mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full ${roles[emp.auth_user_id] === 'admin' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200'}`}>
                      Ruolo: {roles[emp.auth_user_id]}
                    </span>
                  </div>
                )}
                {emp.notes && <div className="text-sm mt-1 text-neutral-600 dark:text-neutral-300">{emp.notes}</div>}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">

                <Button size="sm" variant="secondary" onClick={() => openEdit(emp)}>Modifica</Button>
                {isAdmin ? <Button size="sm" variant="ghost" onClick={() => remove(emp.id)}>Elimina</Button> : null}
                <div className="w-full sm:w-auto" />
                {isAdmin ? <Button size="sm" variant="secondary" onClick={() => startShift(emp)}>Inizia turno</Button> : null}
              </div>
            </Card>
          ))}
          {employees.filter((emp) => emp.name.toLowerCase().includes(search.toLowerCase())).length === 0 && <div className="text-sm text-neutral-500">Nessun dipendente</div>}
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
            <label className="text-sm block mb-1">Associa utente (opzionale)</label>
            <div>
              <select className="w-full border rounded px-3 py-2" value={form.auth_user_id ?? ''} onChange={(e)=>{ const val = e.target.value; setForm(f=>({...f, auth_user_id: val})); const existing = employees.find(en => en.auth_user_id === val && en.id !== (form.id || '')); setAuthWarning(existing ? `Utente già associato a ${existing.name}` : '') }}>
                <option value="">-- Nessuna associazione --</option>
                {availableUsers.map(u => (<option key={u.id} value={u.id}>{u.username || u.id}{u.role ? ` (${u.role})` : ''}</option>))}
              </select>
            </div>
            {authWarning && <div className="text-xs text-amber-600 mt-1">{authWarning}</div>}
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
