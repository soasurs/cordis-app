import type { ChangeEvent } from 'react'

import { useGatewayPresencePreference } from '@/app/gateway-context'
import {
  presenceStatusDotClass,
  presenceStatusLabel,
  presenceStatusOptions,
} from '@/features/presence/presence-preference'
import type { GatewayPresenceStatus } from '@/gateway'

interface PresenceStatusSelectProps {
  size?: 'mobile' | 'rail'
}

export function PresenceStatusSelect({ size = 'rail' }: PresenceStatusSelectProps) {
  const { setStatus, status } = useGatewayPresencePreference()
  const label = presenceStatusLabel(status)

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStatus(event.target.value as GatewayPresenceStatus)
  }

  return (
    <label
      className={`relative grid shrink-0 cursor-pointer place-items-center rounded-panel border border-line bg-surface transition hover:border-line-strong hover:bg-surface-hover focus-within:ring-2 focus-within:ring-brand/70 ${
        size === 'mobile' ? 'size-9' : 'size-10'
      }`}
      title={`Status: ${label}`}
    >
      <span
        aria-hidden="true"
        className={`size-3 rounded-full ring-2 ring-surface ${presenceStatusDotClass(status)}`}
      />
      <span className="sr-only">Status: {label}</span>
      <select
        aria-label="Set presence status"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={status}
        onChange={handleChange}
      >
        {presenceStatusOptions.map((option) => (
          <option key={option.status} value={option.status}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
