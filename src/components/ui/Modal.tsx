import React, { useEffect, useRef, useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /**
   * When true (default), modal will focus the first form control on open.
   * Set to false for read-only/detail modals to avoid opening the keyboard on mobile.
   */
  autoFocus?: boolean
  /**
   * When true, on mobile the modal will appear as a dropdown below the trigger instead of a bottom-sheet.
   */
  mobileDropdown?: boolean
}

export default function Modal({ isOpen, onClose, title, children, autoFocus = true, mobileDropdown = false }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)')
    setIsMobile(mq.matches)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    if (autoFocus) {
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
    }

    // If autoFocus is false, still add key handler and cleanup
    return () => {
      document.removeEventListener('keydown', onKey)
    }    // ensure focused inputs are scrolled into view on mobile when keyboard appears
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

  if (isMobile && mobileDropdown) {
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute top-full right-0 mt-2 w-80 max-w-[95vw] bg-white dark:bg-slate-800 rounded-lg shadow-2xl z-50 overflow-y-auto max-h-[60vh] transform transition-transform duration-300 ease-out animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Chiudi" className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-2 rounded focus:ring-2 focus:ring-amber-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 sm:bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-lg shadow-2xl w-full sm:max-w-2xl overflow-y-auto transform transition-transform duration-300 ease-out scale-100 sm:animate-modal-open animate-slide-up max-h-[60vh] sm:max-h-[calc(100svh-20px)] touch-manipulation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-4">
          <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>

        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-neutral-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">          <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
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

