import React, { useEffect, useState } from 'react'

export default function TopBar() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const formatted = now.toLocaleString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/(^\w)/, (m)=>m.toLowerCase())

  return (
    <div className="sticky top-0 z-40 bg-white/40 dark:bg-[#07101a]/40 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 py-2">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-4 lg:px-6 text-sm text-neutral-600 dark:text-neutral-300">{formatted}</div>
    </div>
  )
}
