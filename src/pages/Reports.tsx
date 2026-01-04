import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

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
        <h2 className="text-2xl font-semibold">Reports</h2>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Entrate mensili</div>
            <div className="mt-2 font-semibold">{incomeRows.length} mesi</div>
          </div>
          <div>
            <Button onClick={downloadCsv}>Esporta CSV</Button>
          </div>
        </div>

        <div className="mt-4">
          {loading && <div>Caricamento...</div>}
          {!loading && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th>Mese</th>
                  <th>Incasso</th>
                </tr>
              </thead>
              <tbody>
                {incomeRows.map((r: any) => (
                  <tr key={r.month} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="py-2">{r.month}</td>
                    <td className="py-2">{Number(r.revenue).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
