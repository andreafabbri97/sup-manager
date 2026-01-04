import React from 'react'

export default function StatCard({ title, value, className = '' }: { title: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 rounded-lg shadow-sm bg-neutral-800 text-white ${className}`}>
      <div className="text-xs uppercase tracking-wide text-neutral-400">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}
