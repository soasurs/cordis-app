import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TokenTransport } from '@/gen/api/v1/authenticator_pb'

const authenticatorClient = vi.hoisted(() => ({
  createGatewayTicket: vi.fn(),
  login: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => authenticatorClient,
}))
vi.mock('@/api/client', () => ({ apiTransport: {} }))
vi.mock('@/api/transport', () => ({ publicApiTransport: {} }))

import { createGatewayTicket, login } from '@/api/authenticator'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authenticator API', () => {
  it('requests HttpOnly cookie credentials when logging in', async () => {
    authenticatorClient.login.mockResolvedValue({
      outcome: { case: 'result', value: { ok: true } },
    })

    await expect(login({ email: 'alex@example.com', password: 'secret' })).resolves.toEqual({
      kind: 'authenticated',
    })
    expect(authenticatorClient.login).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'secret',
      tokenTransport: TokenTransport.COOKIE,
    })
  })

  it('returns a short-lived Gateway ticket', async () => {
    authenticatorClient.createGatewayTicket.mockResolvedValue({ gatewayTicket: 'ticket' })

    await expect(createGatewayTicket()).resolves.toBe('ticket')
    expect(authenticatorClient.createGatewayTicket).toHaveBeenCalledWith({})
  })
})
