import React, { useState } from 'react'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Employees from './Employees'
import Timesheet from './Timesheet'

export default function PeoplePage() {
  const [tab, setTab] = useState<'employees'|'timesheet'>('employees')
  const [role, setRole] = useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    import('../lib/auth').then(({ getCurrentUserRole }) => {
      getCurrentUserRole().then(r => { if (!mounted) return; setRole(r); if (r === 'staff') setTab('timesheet') })
    })
    return () => { mounted = false }
  }, [])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageTitle className="m-0">Dipendenti e Turni</PageTitle>
        <div className="text-xs text-neutral-500">Gestione anagrafiche dipendenti e turni</div>
      </div>

      <Card className="p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 rounded bg-neutral-100 dark:bg-neutral-800 p-1" role="tablist">
          {role !== 'staff' && (
            <button role="tab" aria-selected={tab==='employees'} onClick={()=>setTab('employees')} className={`w-full sm:w-auto px-3 py-2 rounded ${tab==='employees' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Dipendenti</button>
          )}
          <button role="tab" aria-selected={tab==='timesheet'} onClick={()=>setTab('timesheet')} className={`w-full sm:w-auto px-3 py-2 rounded ${tab==='timesheet' ? 'bg-white dark:bg-neutral-700 shadow' : ''}`}>Turni</button>
        </div>
      </Card>

      <div>
        {tab === 'employees' && <Employees />}
        {tab === 'timesheet' && <Timesheet />}
      </div>
    </div>
  )
}
