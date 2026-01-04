import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Line, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend)

function toCSV(rows: any[], headers: string[]) {
  const esc = (v: any) => (v === null || v === undefined ? '' : String(v).replace(/"/g, '""'))
  const csv = [headers.join(',')]
  for (const r of rows) {
    csv.push(headers.map((h) => `"${esc(r[h] ?? '')}"`).join(','))
  }
  return csv.join('\n')
}

export default function Reports() {
  const [incomeRows, setIncomeRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadIncome()
  }, [])

  async function loadIncome() {
    setLoading(true)
    const { data } = await supabase.rpc('report_monthly_income')
    setIncomeRows(data ?? [])
    setLoading(false)
  }

  function downloadCsv() {
    const headers = incomeRows.length ? Object.keys(incomeRows[0]) : ['month','revenue']
    const csv = toCSV(incomeRows, headers)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'monthly-income.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Amministrazione e Report</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border">Reports</button>
          <button className="px-3 py-1 rounded border">Amministrazione</button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm">Da</label>
          <input type="date" className="border px-2 py-1 rounded" />
          <label className="text-sm">A</label>
          <input type="date" className="border px-2 py-1 rounded" />
          <div className="flex-1" />
          <Button>Aggiorna</Button>
          <Button className="bg-gray-600">Esporta CSV</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="mb-4">
              <div className="text-sm text-neutral-500">Entrate giornaliere</div>
              <div className="h-48"><Line data={{labels: [], datasets:[]}} /></div>
            </div>
            <div>
              <div className="text-sm text-neutral-500">Entrate per attrezzatura</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500"><th>Attrezzatura</th><th>Prenotazioni</th><th>Incasso</th></tr>
                </thead>
                <tbody>
                  {/* rows will be populated dynamically */}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-4">
              <div className="text-sm text-neutral-500">Ripartizione entrate</div>
              <div className="h-48"><Pie data={{labels:[], datasets:[{data:[]} ]}} /></div>
            </div>
            <div>
              <div className="text-sm text-neutral-500">Riepilogo</div>
              <ul className="mt-2">
                {/* summary items */}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
