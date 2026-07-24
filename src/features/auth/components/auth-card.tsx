import type { PropsWithChildren, ReactNode } from 'react'

interface AuthCardProps extends PropsWithChildren {
  description: ReactNode
  eyebrow?: string
  footer?: ReactNode
  title: string
}

export function AuthCard({ children, description, eyebrow, footer, title }: AuthCardProps) {
  return (
    <div className="rounded-shell border border-line bg-surface p-6 shadow-panel sm:p-7">
      <header>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={`${eyebrow ? 'mt-3' : ''} text-2xl font-semibold tracking-[-0.035em]`}>
          {title}
        </h1>
        <div className="mt-2 text-sm leading-6 text-muted">{description}</div>
      </header>

      <div className="mt-6">{children}</div>

      {footer ? <footer className="mt-6 border-t border-line pt-5">{footer}</footer> : null}
    </div>
  )
}
