import { Code, ConnectError, type Interceptor } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

import { refreshAuthentication } from '@/api/refresh'
import { getAccessToken } from '@/api/session'

const authenticationInterceptor: Interceptor = (next) => async (request) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    request.header.set('Authorization', `Bearer ${accessToken}`)
  }

  try {
    return await next(request)
  } catch (error) {
    if (ConnectError.from(error).code !== Code.Unauthenticated) {
      throw error
    }

    const refreshed = await refreshAuthentication()
    const refreshedAccessToken = getAccessToken()

    if (!refreshed || !refreshedAccessToken) {
      throw error
    }

    request.header.set('Authorization', `Bearer ${refreshedAccessToken}`)
    return next(request)
  }
}

export const apiTransport = createConnectTransport({
  baseUrl: '/',
  defaultTimeoutMs: 15_000,
  interceptors: [authenticationInterceptor],
})
