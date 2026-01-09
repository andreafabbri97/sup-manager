import React, { useState, useRef, useEffect } from 'react'

type Option = { value: string; label: React.ReactNode }

export default function Listbox({
  options,
  value,
  onChange,
  placeholder = 'Seleziona',
  className = ''
}: {
  options: Option[]
  value: string | null
  onChange: (v: string | null) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div className={`relative inline-block min-w-0 w-full text-left ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-100 touch-manipulation">
        
        <span className="whitespace-normal leading-relaxed break-words">{selected ? selected.label : <span className="text-neutral-400">{placeholder}</span>}</span>
        <svg className="w-4 h-4 ml-2 text-neutral-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path d="M6 8l4 4 4-4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-lg max-h-56 overflow-auto p-1 touch-manipulation">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded ${value === o.value ? 'font-medium' : 'text-neutral-600 dark:text-neutral-300'}`}>
                <span className="whitespace-normal break-words">{o.label}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => { onChange(null); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">Rimuovi selezione</button>
          </li>
        </ul>
      )}
    </div>
  )
}
