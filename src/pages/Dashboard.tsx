import React, { useState } from 'react'
import Sups from '../components/Sups'
import Packages from '../components/Packages'
import Bookings from '../components/Bookings'
import Expenses from '../components/Expenses'
import Equipment from '../components/Equipment'

export default function Dashboard({ page = 'dashboard' }: { page?: string }) {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Interfaccia principale — accesso pubblico</p>
        </div>
      </div>

      {page === 'dashboard' && (
        <>
          <Sups />
          <Packages />
        </>
      )}

      {page === 'equipment' && <Equipment />}
      {page === 'bookings' && <Bookings />}
      {page === 'packages' && <Packages />}
      {page === 'expenses' && <Expenses />}

      <div className="mt-6">
        <div className="text-sm text-slate-500 dark:text-slate-400">Usa la sidebar per navigare tra le sezioni.</div>
      </div>
    </div>
  )
}
