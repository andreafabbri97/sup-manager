import React from 'react'

export default function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-800 shadow-sm rounded-lg p-4 ${className}`}>
      {children}
    </div>
  )
}
