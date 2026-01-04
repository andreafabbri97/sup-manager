import React from 'react'

export default function Button({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white ${className}`}>
      {children}
    </button>
  )
}
