import type { HTMLAttributes } from 'react'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  dot?: boolean
  tone?: BadgeTone
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-line bg-surface-hover text-muted',
  brand: 'border-brand/20 bg-brand-soft text-brand-text',
  success: 'border-positive/20 bg-positive/10 text-positive',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  danger: 'border-negative/20 bg-negative/10 text-negative',
}

export function Badge({
  children,
  className = '',
  dot = false,
  tone = 'neutral',
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-md border px-2 text-[0.68rem] font-semibold ${toneClasses[tone]} ${className}`}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}
