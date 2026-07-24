import type { InputHTMLAttributes } from 'react'

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'children'
> {
  description?: string
  label: string
}

export function Checkbox({ className = '', description, label, ...props }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 text-sm text-ink">
      <input
        {...props}
        type="checkbox"
        className={`mt-0.5 size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      />
      <span>
        <span className="block font-medium">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-subtle">{description}</span>
        ) : null}
      </span>
    </label>
  )
}
