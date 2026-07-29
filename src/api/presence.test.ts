import { beforeEach, describe, expect, it, vi } from 'vitest'

const presenceClient = vi.hoisted(() => ({
  resolveUsersPresence: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => presenceClient,
}))
vi.mock('@/api/client', () => ({ apiTransport: {} }))

import { PresenceStatus } from '@/gen/api/v1/presence_pb'

import { resolveUsersPresence } from '@/api/presence'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('presence API', () => {
  it('deduplicates identifiers and preserves a 64-bit version', async () => {
    presenceClient.resolveUsersPresence.mockResolvedValue({
      presences: [
        {
          lastSeenAt: 1_785_340_000_000n,
          status: PresenceStatus.IDLE,
          userId: 7n,
          version: 12_345_678_901_234_567n,
        },
      ],
    })

    await expect(resolveUsersPresence(['7', '7'])).resolves.toEqual({
      presences: [
        {
          lastSeenAt: 1_785_340_000_000,
          status: 'idle',
          userId: '7',
          version: 12_345_678_901_234_567n,
        },
      ],
      requestedUserIds: ['7'],
    })
    expect(presenceClient.resolveUsersPresence).toHaveBeenCalledWith({ userIds: [7n] })
  })

  it('rejects invalid identifiers and batches larger than the public limit', async () => {
    await expect(resolveUsersPresence(['not-an-id'])).rejects.toThrow('presence user id is invalid')
    await expect(
      resolveUsersPresence(Array.from({ length: 101 }, (_, index) => String(index + 1))),
    ).rejects.toThrow('at most 100 unique presence user ids are allowed')
    expect(presenceClient.resolveUsersPresence).not.toHaveBeenCalled()
  })

  it('rejects an invalid public presence response', async () => {
    presenceClient.resolveUsersPresence.mockResolvedValue({
      presences: [{ lastSeenAt: 0n, status: PresenceStatus.UNSPECIFIED, userId: 7n, version: 1n }],
    })

    await expect(resolveUsersPresence(['7'])).rejects.toThrow('presence status is invalid')
  })
})
