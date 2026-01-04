import React from 'react'

export default function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 shadow-sm rounded-xl p-4 transition-shadow hover:shadow-lg ${className}`}>
      {children}
    </div>
  )
}
