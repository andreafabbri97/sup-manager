import React from 'react'

type Props = {
  children: React.ReactNode
  className?: string
}

export default function PageTitle({ children, className = '' }: Props) {
  return (
    <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-1 ${className}`}>{children}</h1>
  )
}
