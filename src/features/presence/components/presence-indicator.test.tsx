import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PresenceIndicator } from '@/features/presence/components/presence-indicator'

describe('PresenceIndicator', () => {
  it.each([
    ['online', 'online presence'],
    ['idle', 'idle presence'],
    ['dnd', 'do not disturb presence'],
    ['offline', 'offline presence'],
  ] as const)('provides an accessible label for %s', (status, label) => {
    render(
      <span className="relative">
        <PresenceIndicator status={status} />
      </span>,
    )

    expect(screen.getByRole('img', { name: label })).toBeInTheDocument()
  })
})
