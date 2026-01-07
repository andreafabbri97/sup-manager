import React, { useState } from 'react'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Employees from './Employees'
import Timesheet from './Timesheet'
import Payroll from './Payroll'

export default function PeoplePage() {
  const [tab, setTab] = useState<'employees'|'timesheet'|'payroll'>('employees')
  const [role, setRole] = useState<string | null>(null)
  const [staffEmployeeId, setStaffEmployeeId] = useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    import('../lib/auth').then(async ({ getCurrentUserRole, getCurrentUserId }) => {
      const r = await getCurrentUserRole()
      if (!mounted) return
      setRole(r)
      if (r === 'staff') setTab('timesheet')
      if (r === 'staff') {
        const uid = await getCurrentUserId()
        if (uid) {
          const { data: emp } = await (await import('../lib/supabaseClient')).supabase.from('employees').select('id').eq('auth_user_id', uid).maybeSingle()
          if (emp && (emp as any).id) setStaffEmployeeId((emp as any).id)
        }
      }
    })
    return () => { mounted = false }
  }, [])

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageTitle className="m-0">Dipendenti, Turni e Paghe</PageTitle>
        <div className="text-xs text-neutral-500">Gestione anagrafiche, turni e paghe</div>
      </div>

      <Card className="p-3 mb-4">
        <div className="flex flex-row gap-2 rounded bg-neutral-100 dark:bg-neutral-800 p-1" role="tablist">
          {role !== 'staff' && (
            <button role="tab" aria-selected={tab==='employees'} onClick={()=>setTab('employees')} className={`flex-1 px-3 py-2 text-sm rounded ${tab==='employees' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Dipendenti</button>
          )}
          <button role="tab" aria-selected={tab==='timesheet'} onClick={()=>setTab('timesheet')} className={`flex-1 px-3 py-2 text-sm rounded ${tab==='timesheet' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Turni</button>
          <button role="tab" aria-selected={tab==='payroll'} onClick={()=>setTab('payroll')} className={`flex-1 px-3 py-2 text-sm rounded ${tab==='payroll' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Paghe</button>
        </div>
      </Card>

      <div>
        {tab === 'employees' && <Employees />}
        {tab === 'timesheet' && <Timesheet />}
        {tab === 'payroll' && <Payroll lockedEmployeeId={role === 'staff' ? staffEmployeeId : null} />}
      </div>
    </div>
  )
}
