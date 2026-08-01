import { Code, ConnectError } from '@connectrpc/connect'

import { PublicErrorInfoSchema } from '@/gen/api/v1/error_pb'

export function isResourceConflictError(error: unknown) {
  const connectError = ConnectError.from(error)
  const publicError = connectError.findDetails(PublicErrorInfoSchema)[0]
  return publicError?.code === 'resource.conflict' || connectError.code === Code.Aborted
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  const connectError = ConnectError.from(error)
  const publicError = connectError.findDetails(PublicErrorInfoSchema)[0]

  if (publicError?.message) {
    return publicError.message
  }

  if (connectError.code === Code.Unavailable) {
    return 'Unable to reach Cordis. Check your connection and try again.'
  }

  if (connectError.code === Code.DeadlineExceeded) {
    return 'The request took too long. Please try again.'
  }

  return fallback
}
