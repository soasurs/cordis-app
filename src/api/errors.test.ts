import { create } from '@bufbuild/protobuf'
import { Code, ConnectError } from '@connectrpc/connect'
import { describe, expect, it } from 'vitest'

import { PublicErrorInfoSchema } from '@/gen/api/v1/error_pb'

import { getApiErrorMessage } from './errors'

describe('getApiErrorMessage', () => {
  it('uses the server-provided public error message', () => {
    const detail = create(PublicErrorInfoSchema, {
      code: 'auth.invalid_credentials',
      message: 'Invalid email or password.',
    })
    const error = new ConnectError('authentication failed', Code.Unauthenticated, undefined, [
      { desc: PublicErrorInfoSchema, value: detail },
    ])

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Invalid email or password.')
  })

  it('turns connection failures into an actionable message', () => {
    const error = new ConnectError('fetch failed', Code.Unavailable)

    expect(getApiErrorMessage(error, 'Fallback')).toBe(
      'Unable to reach Cordis. Check your connection and try again.',
    )
  })

  it('does not expose an error without public details', () => {
    expect(getApiErrorMessage(new Error('database password leaked'), 'Safe fallback')).toBe(
      'Safe fallback',
    )
  })
})
