import React from 'react'

export default function Card({ title, children, footer, className = '', as = 'div', ...rest }: { title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; className?: string; as?: any }) {
  const Component: any = as
  return (
    <Component {...rest} className={`app-card animate-fade-up transition-shadow ${className}`}>
      {title && <div className="card-title">{title}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </Component>
  )
}
