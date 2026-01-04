import React from 'react'

export default function Input({ label, value, onChange, type = 'text', placeholder = '', className = '' }: { label?: string; value: any; onChange: (e: any) => void; type?: string; placeholder?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-1">{label}</div>}
      <input
        aria-label={label}
        className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-amber-300 focus:outline-none transition-shadow duration-150 placeholder:text-neutral-400"
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
      />
    </label>
  )
}
