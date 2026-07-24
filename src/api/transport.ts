import { createConnectTransport } from '@connectrpc/connect-web'

export const publicApiTransport = createConnectTransport({
  baseUrl: '/',
  defaultTimeoutMs: 15_000,
})
