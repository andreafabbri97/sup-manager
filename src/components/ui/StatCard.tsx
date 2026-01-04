import React from 'react'

export default function StatCard({ title, value, className = '' }: { title: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 rounded-lg shadow-sm bg-gradient-to-r from-brand-400 to-brand-600 text-white ${className}`}>
      <div className="text-sm opacity-90">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}
