import React, { useEffect } from 'react'
import Sups from '../components/Sups'
import Packages from '../components/Packages'
import Bookings from '../components/Bookings'
import Expenses from '../components/Expenses'

export default function Dashboard() {
  useEffect(() => {
    // No auth: public interface
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-slate-600">Interfaccia principale — accesso pubblico</p>
        </div>
      </div>

      <Sups />
      <Packages />
      <Bookings />
      <Expenses />
    </div>
  )
}
