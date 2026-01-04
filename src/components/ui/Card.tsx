import React from 'react'

type CardProps<T extends React.ElementType = 'div'> = {
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  as?: T
} & React.ComponentPropsWithoutRef<T>

export default function Card<T extends React.ElementType = 'div'>({ title, children, footer, className = '', as, ...rest }: CardProps<T>) {
  const Component: any = as || 'div'
  return (
    <Component {...rest} className={`app-card animate-fade-up transition-shadow ${className}`}>
      {title && <div className="card-title">{title}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </Component>
  )
}
