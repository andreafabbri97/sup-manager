import React, { useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      // Prefer focusing the first form control (input/select/textarea). If none found, fall back to first focusable.
      const firstControl = dialogRef.current?.querySelector('input, select, textarea') as HTMLElement | null
      if (firstControl) {
        firstControl.focus()
        return
      }
      const fallback = dialogRef.current?.querySelector('button:not([aria-label="Chiudi"]), [href], [tabindex]:not([tabindex="-1"])') as HTMLElement | null
      fallback?.focus()
    }, 10)
    // ensure focused inputs are scrolled into view on mobile when keyboard appears
    const onFocusIn = (ev: any) => {
      const target = ev.target as HTMLElement | null
      if (!target) return
      // small timeout to allow virtual keyboard to open
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    }
    dialogRef.current?.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      dialogRef.current?.removeEventListener('focusin', onFocusIn)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-lg shadow-2xl w-full sm:max-w-2xl overflow-y-auto transform transition-transform duration-200 ease-out scale-100 animate-modal-open"
        style={{ maxHeight: 'calc(100svh - 20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>

        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-neutral-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Chiudi" className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-2 rounded focus:ring-2 focus:ring-amber-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

