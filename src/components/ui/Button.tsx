import React from 'react'

export default function Button({ children, onClick, className = '', disabled = false, type = 'button' }: { children: React.ReactNode; onClick?: () => void; className?: string, disabled?: boolean, type?: 'button'|'submit'|'reset' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`btn ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-amber-600'} ${className}`}>
      {children}
    </button>
  )
}
