import { create } from '@bufbuild/protobuf'
import { Code, ConnectError } from '@connectrpc/connect'
import { describe, expect, it } from 'vitest'

import { PublicErrorInfoSchema } from '@/gen/api/v1/error_pb'

import { getApiErrorMessage, isResourceConflictError } from '@/api/errors'

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

  it('recognizes the public resource conflict code', () => {
    const detail = create(PublicErrorInfoSchema, {
      code: 'resource.conflict',
      message: 'The channel layout changed.',
    })
    const error = new ConnectError('conflict', Code.Internal, undefined, [
      { desc: PublicErrorInfoSchema, value: detail },
    ])

    expect(isResourceConflictError(error)).toBe(true)
  })

  it('falls back to Connect Aborted when public conflict details are absent', () => {
    expect(isResourceConflictError(new ConnectError('conflict', Code.Aborted))).toBe(true)
    expect(isResourceConflictError(new ConnectError('bad request', Code.InvalidArgument))).toBe(
      false,
    )
  })
})
