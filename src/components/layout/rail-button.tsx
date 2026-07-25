import * as Tooltip from '@radix-ui/react-tooltip'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function RailButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  disabled?: boolean
  label: string
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-current={active ? 'page' : undefined}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={`group relative grid size-10 place-items-center overflow-hidden rounded-panel border text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
            active
              ? 'border-brand bg-brand text-white shadow-brand'
              : 'border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:bg-surface disabled:hover:text-muted'
          }`}
        >
          {active ? (
            <span className="absolute -left-[0.8rem] h-6 w-0.5 rounded-r bg-brand" />
          ) : null}
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 rounded-control border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-panel"
        >
          {label}
          <Tooltip.Arrow className="fill-surface" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
