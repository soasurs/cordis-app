import { Code, ConnectError, type Interceptor } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

import { getAuthenticationGeneration, notifyAuthenticationExpired } from '@/api/authentication'

const authenticationInterceptor: Interceptor = (next) => async (request) => {
  const authenticationGeneration = getAuthenticationGeneration()

  try {
    return await next(request)
  } catch (error) {
    if (ConnectError.from(error).code === Code.Unauthenticated) {
      notifyAuthenticationExpired(authenticationGeneration)
    }

    throw error
  }
}

export const apiTransport = createConnectTransport({
  baseUrl: '/',
  defaultTimeoutMs: 15_000,
  interceptors: [authenticationInterceptor],
})
