import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import InstallButton from '../components/InstallButton'
import { supabase } from '../lib/supabaseClient'

export default function Settings() {
  const [iva, setIva] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('app_setting').select('value').eq('key', 'iva_percent').single()
    const val = data?.value ? Number(data.value) : 22
    setIva(Number.isFinite(val) ? val : 22)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (iva === null) return
    setLoading(true)
    const { error } = await supabase.from('app_setting').upsert({ key: 'iva_percent', value: String(iva) })
    setLoading(false)
    if (error) return alert(error.message)
    // notify other parts of the app
    window.dispatchEvent(new CustomEvent('settings:changed', { detail: { key: 'iva_percent', value: iva } }))
    alert('Impostazioni salvate')
  }

  return (
    <div className="w-full p-6">
      <PageTitle className="mb-4">Impostazioni</PageTitle>
      <Card>
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="col-span-2">
            <label className="text-sm block mb-1">IVA (%)</label>
            <input type="number" value={iva ?? ''} onChange={(e)=>setIva(Number(e.target.value))} className="border px-2 py-1 rounded w-32" />
            <p className="text-xs text-neutral-500 mt-1">Valore IVA applicato alle statistiche e al calcolo del profitto.</p>
          </div>
          <div>
            <Button type="submit">{loading ? 'Salvo...' : 'Salva'}</Button>
          </div>
        </form>
      </Card>

      <div className="mt-4">
        <Card>
          <h3 className="font-semibold mb-2">Installa l'app (PWA)</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">Se stai usando il sito via browser, puoi installare l'app sul tuo dispositivo per un accesso più rapido e notifiche migliori.</p>
          <div className="flex items-center gap-3">
            <InstallButton inline />
            <button title="iOS: apri il menu Condividi → " aria-label="Istruzioni installazione iOS" className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v6" />
                <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
              </svg>
            </button>
            <div className="text-xs text-neutral-500">Su iOS: <span className="font-medium">Condividi → Aggiungi a schermata Home</span></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
