import { useId, type InputHTMLAttributes } from 'react'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  hint?: string
  label: string
}

export function TextInput({ className = '', error, hint, id, label, ...props }: TextInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = error || hint ? `${inputId}-description` : undefined

  return (
    <label htmlFor={inputId} className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input
        {...props}
        id={inputId}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        className={`min-h-10 w-full rounded-control border bg-canvas/70 px-3 text-sm text-ink outline-none transition placeholder:text-subtle hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-45 ${error ? 'border-negative/70' : 'border-line'} ${className}`}
      />
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
