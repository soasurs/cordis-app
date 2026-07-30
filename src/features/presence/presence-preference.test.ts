import { beforeEach, describe, expect, it } from 'vitest'

import { readPresenceStatus, writePresenceStatus } from '@/features/presence/presence-preference'

beforeEach(() => {
  window.localStorage.clear()
})

describe('presence preference', () => {
  it('stores status separately for each user', () => {
    writePresenceStatus('7', 'dnd')
    writePresenceStatus('8', 'invisible')

    expect(readPresenceStatus('7')).toBe('dnd')
    expect(readPresenceStatus('8')).toBe('invisible')
  })

  it('falls back to online for missing or invalid values', () => {
    window.localStorage.setItem('cordis.presenceStatus.7', 'offline')

    expect(readPresenceStatus('7')).toBe('online')
    expect(readPresenceStatus()).toBe('online')
  })
})
