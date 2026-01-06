import React, { useEffect, useState } from 'react'

export default function TopBar() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const datePart = now.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).replace(/(^\w)/, (m)=>m.toLowerCase())
  const timePart = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const formatted = `${datePart} ore ${timePart}`

  return (
    <div className="sticky top-0 z-40 bg-white/40 dark:bg-[#07101a]/40 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 py-0">
      <div className="w-full px-2 sm:px-4 lg:px-6 text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-3">
        {/* Mobile menu button moved here to avoid floating overlay */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('sidebar:toggle'))}
          aria-controls="sidebar"
          aria-label="Apri menu"
          className="lg:hidden p-2 rounded-md bg-white/90 dark:bg-neutral-900/90 backdrop-blur shadow"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 truncate">{formatted}</div>
        <div className="flex items-center gap-3">
          {/* Link to login page / account */}
          <button onClick={() => { try { window.dispatchEvent(new CustomEvent('navigate:login')) } catch (e) {} }} className="text-sm px-3 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200">
            Login
          </button>
        </div>
      </div>
    </div>
  )
}
