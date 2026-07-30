import type { ReactNode } from 'react'

import { useGatewayPresencePreference } from '@/app/gateway-context'
import { SelectMenu } from '@/components/ui/select-menu'
import {
  presenceStatusDotClass,
  presenceStatusLabel,
  presenceStatusOptions,
} from '@/features/presence/presence-preference'
import type { GatewayPresenceStatus } from '@/gateway'

interface PresenceStatusSelectProps {
  ariaLabel?: string
  children?: ReactNode
  size?: 'mobile' | 'rail'
  variant?: 'compact' | 'panel'
}

export function PresenceStatusSelect({
  ariaLabel = 'Set presence status',
  children,
  size = 'rail',
  variant = 'compact',
}: PresenceStatusSelectProps) {
  const { setStatus, status } = useGatewayPresencePreference()
  const label = presenceStatusLabel(status)
  const panel = variant === 'panel'
  const options = presenceStatusOptions.map((option) => ({
    label: option.label,
    leading: (
      <span
        aria-hidden="true"
        className={`size-3 shrink-0 rounded-full ring-2 ring-surface ${presenceStatusDotClass(option.status)}`}
      />
    ),
    value: option.status,
  }))

  return (
    <SelectMenu<GatewayPresenceStatus>
      ariaLabel={ariaLabel}
      className={panel ? 'min-w-0 flex-1' : 'shrink-0'}
      menuClassName={panel ? 'min-w-52 max-w-full' : ''}
      options={options}
      placement={panel ? 'top-start' : size === 'mobile' ? 'bottom-end' : 'right-end'}
      title={`Status: ${label}`}
      triggerClassName={
        panel
          ? 'flex min-h-12 w-full min-w-0 items-center gap-3 rounded-control px-1.5 text-left outline-none transition hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/70'
          : `grid shrink-0 place-items-center rounded-panel border border-line bg-surface outline-none transition hover:border-line-strong hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/70 ${
              size === 'mobile' ? 'size-9' : 'size-10'
            }`
      }
      value={status}
      onValueChange={setStatus}
    >
      {children ?? (
        <>
          <span
            aria-hidden="true"
            className={`size-3 rounded-full ring-2 ring-surface ${presenceStatusDotClass(status)}`}
          />
          <span className="sr-only">Status: {label}</span>
        </>
      )}
    </SelectMenu>
  )
}
