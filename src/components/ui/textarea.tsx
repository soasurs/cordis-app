import { useId, type TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  hint?: string
  label: string
}

export function Textarea({ className = '', error, hint, id, label, ...props }: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const descriptionId = error || hint ? `${textareaId}-description` : undefined

  return (
    <label htmlFor={textareaId} className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <textarea
        {...props}
        id={textareaId}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        className={`min-h-24 w-full resize-y rounded-control border bg-canvas/70 px-3 py-2.5 text-sm leading-6 text-ink outline-none transition placeholder:text-subtle hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-45 ${
          error ? 'border-negative/70' : 'border-line'
        } ${className}`}
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
