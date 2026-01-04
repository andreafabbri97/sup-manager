import React from 'react'

export default function Button({ children, onClick, className = '', disabled = false, type = 'button' }: { children: React.ReactNode; onClick?: () => void; className?: string, disabled?: boolean, type?: 'button'|'submit'|'reset' }) {
  const base = 'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2'
  const active = disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'
  const color = 'bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 focus:ring-amber-300'
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${color} ${active} ${className}`}>
      {children}
    </button>
  )
}
