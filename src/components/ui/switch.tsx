import type { ButtonHTMLAttributes } from 'react'

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'role' | 'onChange'
> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Switch({ checked, className = '', onCheckedChange, ...props }: SwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border outline-none transition focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-hover'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        data-slot="switch-thumb"
        className={`absolute top-0.5 left-[3px] size-3.5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
