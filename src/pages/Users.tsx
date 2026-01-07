import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import PageTitle from '../components/ui/PageTitle'
import { supabase } from '../lib/supabaseClient'

interface UserRole {
  id: string
  role: 'admin' | 'staff'
  created_at?: string | null
}

interface EmployeeLite {
  id: string
  name: string
  auth_user_id?: string | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRole[]>([])
  const [employees, setEmployees] = useState<EmployeeLite[]>([])
  const [loading, setLoading] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff')
  const [isAdmin, setIsAdmin] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    let mounted = true
    import('../lib/auth').then(({ getCurrentUserRole }) => {
      getCurrentUserRole().then(r => { if (mounted) setIsAdmin(r === 'admin') })
    })
    const onAuthChanged = () => { import('../lib/auth').then(({ getCurrentUserRole }) => getCurrentUserRole().then(r => setIsAdmin(r === 'admin'))) }
    window.addEventListener('auth:changed', onAuthChanged as any)
    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged as any) }
  }, [])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: userRows, error: userErr }, { data: employeeRows, error: empErr }] = await Promise.all([
      supabase.from('app_user').select('id, username, role, created_at').order('created_at', { ascending: false }),
      supabase.from('employees').select('id, name, auth_user_id').order('name', { ascending: true })
    ])
    setLoading(false)
    if (userErr) window.dispatchEvent(new CustomEvent('toast', { detail: { message: userErr.message, type: 'error' } }))
    if (empErr) window.dispatchEvent(new CustomEvent('toast', { detail: { message: empErr.message, type: 'error' } }))
    setUsers((userRows as any) || [])
    setEmployees((employeeRows as any) || [])
  }

  async function upsertUser(id: string, role: 'admin' | 'staff') {
    if (!id) return
    if (!isAdmin) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Accesso negato', type: 'error' } })); return }
    const { error } = await supabase.from('app_user').upsert({ id, role })
    if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
    setUsers((prev) => {
      const existing = prev.find((u) => u.id === id)
      if (existing) return prev.map((u) => (u.id === id ? { ...u, role } : u))
      return [{ id, role }, ...prev]
    })
    window.dispatchEvent(new CustomEvent('auth:changed'))
  }

  async function removeUser(id: string) {
    if (!isAdmin) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Accesso negato', type: 'error' } })); return }
    if (!window.confirm('Rimuovere questo utente?')) return
    const { error } = await supabase.from('app_user').delete().eq('id', id)
    if (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } })); return }
    setUsers((prev) => prev.filter((u) => u.id !== id))
    window.dispatchEvent(new CustomEvent('auth:changed'))
  }

  const employeeByAuth: Record<string, EmployeeLite> = {}
  employees.forEach((e) => { if (e.auth_user_id) employeeByAuth[e.auth_user_id] = e })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageTitle className="m-0">Utenti</PageTitle>
        <div className="text-xs text-neutral-500">{users.length} utenti</div>
      </div>

      <Card className="p-4 sm:p-6 space-y-3">
        <div className="font-semibold">Utenti interni</div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">Crea e gestisci gli utenti interni dell'app.</p>
          <Button onClick={() => setShowNewModal(true)} disabled={!isAdmin}>Nuovo utente</Button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">Suggerimento: collega gli utenti alle anagrafiche dipendenti modificando il campo <code>auth_user_id</code> sull'anagrafica Dipendenti.</p>

        {/* New User Modal */}
        <Modal isOpen={showNewModal} onClose={() => { setShowNewModal(false); setNewUsername(''); setNewPassword(''); setNewRole('staff') }} title="Nuovo utente" mobileCentered>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm block mb-1">Username</label>
              <input className="w-full border rounded px-3 py-2" value={newUsername} onChange={(e)=>setNewUsername(e.target.value)} placeholder="username" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="username" inputMode="text" />
            </div>
            <div>
              <label className="text-sm block mb-1">Password</label>
              <input className="w-full border rounded px-3 py-2" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="password" />
            </div>
            <div>
              <label className="text-sm block mb-1">Ruolo</label>
              <select className="w-full border rounded px-3 py-2" value={newRole} onChange={(e)=>setNewRole(e.target.value as any)}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={async ()=>{
                if (!newUsername || !newPassword) return window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Inserisci username e password', type: 'error' } }))
                const token = window.localStorage.getItem('app_session_token') || null
                const { data, error } = await supabase.rpc('create_internal_user', { p_username: newUsername, p_password: newPassword, p_role: newRole, p_session_token: token })
                if (error) return window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message, type: 'error' } }))
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Utente creato', type: 'success' } }))
                setNewUsername(''); setNewPassword(''); setNewRole('staff'); setShowNewModal(false); load()
              }} disabled={!newUsername || !newPassword}>Crea</Button>
              <Button variant="ghost" onClick={()=>{ setNewUsername(''); setNewPassword(''); setNewRole('staff') }}>Reset</Button>
            </div>
          </div>
        </Modal>
      </Card>

      {loading && <div className="text-sm text-neutral-500">Caricamento...</div>}

      <div className="grid gap-3 sm:gap-4">
        {users.map((u) => {
          const emp = employeeByAuth[u.id]
          return (
            <Card key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold break-all">{u.username || u.id}</div>
                <div className="text-xs text-neutral-500">Ruolo: {u.role}</div>
                {emp && <div className="text-xs text-neutral-600 dark:text-neutral-300">Dipendente: {emp.name}</div>}
                {u.created_at && <div className="text-xs text-neutral-400">Creato: {new Date(u.created_at).toLocaleString('it-IT')}</div>}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Button size="sm" variant="secondary" onClick={()=>upsertUser(u.id, 'admin')}>Rendi admin</Button>
                <Button size="sm" variant="ghost" onClick={()=>upsertUser(u.id, 'staff')}>Rendi staff</Button>
                <Button size="sm" variant="ghost" onClick={()=>removeUser(u.id)}>Rimuovi</Button>
              </div>
            </Card>
          )
        })}
        {users.length === 0 && !loading && <div className="text-sm text-neutral-500">Nessun utente.</div>}
      </div>
    </div>
  )
}
