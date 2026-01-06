import React, { useEffect, useState } from 'react'

interface Toast { id: string; message: string; type?: 'info'|'success'|'error' }

export default function Toasts() {
  const [list, setList] = useState<Toast[]>([])

  useEffect(() => {
    const onToast = (ev: any) => {
      const t: Toast = { id: String(Date.now()) + Math.random().toString(36).slice(2,8), message: ev?.detail?.message || '', type: ev?.detail?.type }
      setList((s) => [...s, t])
      setTimeout(() => {
        setList((s) => s.filter(x => x.id !== t.id))
      }, ev?.detail?.duration || 3500)
    }
    window.addEventListener('toast', onToast as any)
    return () => window.removeEventListener('toast', onToast as any)
  }, [])

  if (list.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-60 flex flex-col gap-2">
      {list.map(t => (
        <div key={t.id} className={`px-4 py-2 rounded shadow ${t.type==='error' ? 'bg-rose-600 text-white' : t.type==='success' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
