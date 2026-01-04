import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>

        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-neutral-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-2 rounded"
          >
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
