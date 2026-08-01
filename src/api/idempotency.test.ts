import { describe, expect, it } from 'vitest'

import {
  assertIdempotencyKey,
  createIdempotencyKey,
  getIdempotencyKeyForIntent,
  optionalIdempotencyKey,
} from '@/api/idempotency'

describe('idempotency helpers', () => {
  it('creates UUID-shaped keys', () => {
    expect(createIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('validates the backend key constraints in bytes', () => {
    expect(() => assertIdempotencyKey('')).toThrow('idempotency key is required')
    expect(() => assertIdempotencyKey(' intent')).toThrow('leading or trailing whitespace')
    expect(() => assertIdempotencyKey('intent ')).toThrow('leading or trailing whitespace')
    expect(() => assertIdempotencyKey('x'.repeat(256))).toThrow('idempotency key is too long')
    expect(() => assertIdempotencyKey('é'.repeat(128))).toThrow('idempotency key is too long')
    expect(() => assertIdempotencyKey('x'.repeat(255))).not.toThrow()
  })

  it('omits absent keys and preserves supplied keys', () => {
    expect(optionalIdempotencyKey(undefined)).toEqual({})
    expect(optionalIdempotencyKey('intent-1')).toEqual({ idempotencyKey: 'intent-1' })
  })

  it('reuses a key only while the intent fingerprint is unchanged', () => {
    const first = getIdempotencyKeyForIntent(undefined, 'name:one')
    const retry = getIdempotencyKeyForIntent(first, 'name:one')
    const changed = getIdempotencyKeyForIntent(retry, 'name:two')

    expect(retry).toBe(first)
    expect(changed.key).not.toBe(first.key)
  })
})
