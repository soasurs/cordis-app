import { useId, useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string
  hint?: string
  label: string
}

export function PasswordInput({
  className = '',
  error,
  hint,
  id,
  label,
  ...props
}: PasswordInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = error || hint ? `${inputId}-description` : undefined
  const [visible, setVisible] = useState(false)

  return (
    <label htmlFor={inputId} className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <span className="relative block">
        <input
          {...props}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          className={`min-h-10 w-full rounded-control border bg-canvas/70 py-2 pr-16 pl-3 text-sm text-ink outline-none transition placeholder:text-subtle hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-45 ${error ? 'border-negative/70' : 'border-line'} ${className}`}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-subtle transition hover:text-brand-text focus-visible:rounded-control focus-visible:outline-2 focus-visible:outline-brand"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {error || hint ? (
        <span
          id={descriptionId}
          className={`text-xs font-normal ${error ? 'text-negative' : 'text-subtle'}`}
        >
          {error ?? hint}
        </span>
      ) : null}
    </label>
  )
}
