import { beforeEach, describe, expect, it, vi } from 'vitest'

const userClient = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => userClient,
}))
vi.mock('./client', () => ({ apiTransport: {} }))

import { getUserProfile } from '@/api/user'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('user API', () => {
  it('maps a public profile into the application representation', async () => {
    userClient.getUserProfile.mockResolvedValue({
      profile: {
        avatarAssetId: 9n,
        bio: 'Building thoughtful tools.',
        createdAt: 1_000n,
        name: 'Alex Chen',
        updatedAt: 2_000n,
        userId: 7n,
        username: 'alex_chen',
      },
    })

    await expect(getUserProfile('7')).resolves.toEqual({
      avatarAssetId: '9',
      bio: 'Building thoughtful tools.',
      createdAt: 1_000,
      name: 'Alex Chen',
      updatedAt: 2_000,
      userId: '7',
      username: 'alex_chen',
    })
    expect(userClient.getUserProfile).toHaveBeenCalledWith({ userId: 7n })
  })

  it('rejects an invalid user identifier before calling the API', async () => {
    await expect(getUserProfile('not-an-id')).rejects.toThrow('user id is invalid')
    expect(userClient.getUserProfile).not.toHaveBeenCalled()
  })
})
