import React from 'react'

export default function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 shadow-sm rounded-xl p-3 sm:p-4 lg:p-5 transition-shadow hover:shadow-lg ${className}`}>
      {children}
    </div>
  )
}
