import React from 'react'

export default function StatCard({ title, value, className = '', color = 'neutral' }: { title: string; value: React.ReactNode; className?: string; color?: 'neutral'|'success'|'warning'|'accent' }) {
  const colorClasses: Record<string,string> = {
    neutral: 'bg-gradient-to-b from-neutral-800 to-neutral-700 text-white',
    success: 'bg-gradient-to-b from-emerald-700 to-emerald-600 text-white',
    warning: 'bg-gradient-to-b from-amber-600 to-amber-500 text-white',
    accent: 'bg-gradient-to-b from-violet-700 to-violet-600 text-white'
  }
  return (
    <div className={`flex-1 min-w-[10rem] sm:min-w-[13rem] md:min-w-[14rem] max-w-[22rem] p-4 rounded-xl shadow-md min-h-[72px] flex flex-col justify-center transition-transform transform hover:-translate-y-1 ${colorClasses[color]} ${className}`}>
      <div className="text-sm uppercase tracking-wide text-white/90">{title}</div>
      <div className="mt-2 text-2xl font-semibold leading-none transition-colors duration-150">{value}</div>
    </div>
  )
}
