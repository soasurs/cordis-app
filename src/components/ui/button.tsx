import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'small' | 'medium'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-brand bg-brand text-white shadow-brand hover:border-brand-strong hover:bg-brand-strong',
  secondary:
    'border-line-strong bg-surface-raised text-ink hover:border-subtle hover:bg-surface-hover',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-surface-hover hover:text-ink',
  danger:
    'border-negative/25 bg-negative/10 text-negative hover:border-negative/40 hover:bg-negative/15',
}

const sizeClasses: Record<ButtonSize, string> = {
  small: 'min-h-8 rounded-control px-3 text-xs',
  medium: 'min-h-10 rounded-control px-4 text-sm',
}

export function Button({
  children,
  className = '',
  disabled,
  loading = false,
  size = 'medium',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 border font-semibold transition duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children}
    </button>
  )
}
