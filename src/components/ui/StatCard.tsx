import React from 'react'

export default function StatCard({ title, value, className = '', color = 'neutral' }: { title: string; value: React.ReactNode; className?: string; color?: 'neutral'|'success'|'warning'|'accent' }) {
  const colorClasses: Record<string,string> = {
    neutral: 'bg-neutral-800 text-white',
    success: 'bg-emerald-700 text-white',
    warning: 'bg-amber-600 text-white',
    accent: 'bg-violet-700 text-white'
  }
  return (
    <div className={`min-w-[12rem] sm:min-w-[14rem] p-4 rounded-xl shadow-sm ${colorClasses[color]} ${className}`}>
      <div className="text-xs uppercase tracking-wide text-neutral-200">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}
