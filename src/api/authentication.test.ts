import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getAuthenticationGeneration,
  markAuthenticationEstablished,
  notifyAuthenticationExpired,
  subscribeToAuthenticationExpired,
} from '@/api/authentication'

const unsubscribers: Array<() => void> = []

afterEach(() => {
  for (const unsubscribe of unsubscribers.splice(0)) {
    unsubscribe()
  }
})

describe('authentication lifecycle', () => {
  it('notifies active subscribers when authentication expires', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToAuthenticationExpired(listener)
    unsubscribers.push(unsubscribe)
    const generation = getAuthenticationGeneration()

    notifyAuthenticationExpired(generation)
    unsubscribe()
    notifyAuthenticationExpired(getAuthenticationGeneration())

    expect(listener).toHaveBeenCalledOnce()
  })

  it('ignores an expiry response from an older authentication generation', () => {
    const listener = vi.fn()
    unsubscribers.push(subscribeToAuthenticationExpired(listener))
    const oldGeneration = getAuthenticationGeneration()

    markAuthenticationEstablished()
    notifyAuthenticationExpired(oldGeneration)

    expect(listener).not.toHaveBeenCalled()
  })
})
