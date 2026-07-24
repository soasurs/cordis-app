import { useId, type SelectHTMLAttributes } from 'react'

export interface SelectOption {
  label: string
  value: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hint?: string
  label: string
  options: SelectOption[]
}

export function Select({ className = '', hint, id, label, options, ...props }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const descriptionId = hint ? `${selectId}-description` : undefined

  return (
    <label htmlFor={selectId} className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <select
        {...props}
        id={selectId}
        aria-describedby={descriptionId}
        className={`min-h-10 w-full rounded-control border border-line bg-canvas/70 px-3 text-sm text-ink outline-none transition hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span id={descriptionId} className="text-xs font-normal text-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
