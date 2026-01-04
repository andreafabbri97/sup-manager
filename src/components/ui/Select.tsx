import React from 'react'

export default function Select({ label, value, onChange, options, className = '' }: { label?: string; value: any; onChange: (e: any) => void; options: Array<{ value: any; label: string }>; className?: string }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-1">{label}</div>}
      <select className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-amber-300 focus:outline-none" value={value} onChange={onChange}>
        {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
