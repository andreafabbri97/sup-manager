import React from 'react'

export default function Button({ children, onClick, className = '', disabled = false, type = 'button', variant = 'primary', size = 'md' }: { children: React.ReactNode; onClick?: (...args: any[]) => any; className?: string, disabled?: boolean, type?: 'button'|'submit'|'reset', variant?: 'primary'|'secondary'|'ghost'|'link', size?: 'sm'|'md' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-180 will-change-transform focus:outline-none focus:ring-2 focus:ring-offset-2'
  const active = disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-md active:scale-95'
  let variantClass = ''
  switch (variant) {
    case 'secondary':
      variantClass = 'bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-slate-800 dark:text-slate-100 focus:ring-amber-300'
      break
    case 'ghost':
      variantClass = 'bg-transparent text-slate-800 dark:text-slate-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-amber-300'
      break
    case 'link':
      variantClass = 'bg-transparent text-amber-600 underline hover:text-amber-700 focus:ring-0'
      break
    default:
      variantClass = 'bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 focus:ring-amber-300'
  }
  const sizeClass = size === 'sm' ? 'px-3 py-1 text-xs rounded' : ''
  return (
    <button type={type} onClick={(e) => onClick?.(e)} disabled={disabled} className={`${base} ${sizeClass} ${variantClass} ${active} ${className}`}>
      {children}
    </button>
  )
}
