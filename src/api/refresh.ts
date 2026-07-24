import { Code, ConnectError, createClient } from '@connectrpc/connect'

import { AuthenticatorService } from '@/gen/api/v1/authenticator_pb'

import { clearAuthenticationTokens, getRefreshToken, storeAuthenticationTokens } from './session'
import { publicApiTransport } from './transport'

const refreshClient = createClient(AuthenticatorService, publicApiTransport)

let refreshPromise: Promise<boolean> | undefined

export function refreshAuthentication() {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = undefined
    })
  }

  return refreshPromise
}

async function performRefresh() {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    return false
  }

  try {
    const response = await refreshClient.refresh({ refreshToken })

    if (!response.result?.ok) {
      clearAuthenticationTokens()
      return false
    }

    storeAuthenticationTokens(response.result)
    return true
  } catch (error) {
    const code = ConnectError.from(error).code

    if (code === Code.Unauthenticated || code === Code.PermissionDenied) {
      clearAuthenticationTokens()
      return false
    }

    throw error
  }
}
