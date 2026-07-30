import { beforeEach, describe, expect, it, vi } from 'vitest'

const relationshipClient = vi.hoisted(() => ({
  acceptFriendRequest: vi.fn(),
  blockUser: vi.fn(),
  declineFriendRequest: vi.fn(),
  listRelationships: vi.fn(),
  lookupUser: vi.fn(),
  removeFriend: vi.fn(),
  sendFriendRequest: vi.fn(),
  unblockUser: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => relationshipClient,
}))
vi.mock('@/api/client', () => ({ apiTransport: {} }))

import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  listRelationships,
  lookupUser,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from '@/api/relationship'
import { RelationshipType as ProtoRelationshipType } from '@/gen/api/v1/user_pb'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('relationship API', () => {
  it('looks up a user by a normalized username', async () => {
    relationshipClient.lookupUser.mockResolvedValue({
      profile: createProfile({ userId: 7n, username: 'alex' }),
    })

    await expect(lookupUser('  alex  ')).resolves.toEqual({
      avatarAssetId: '9',
      bio: 'Building thoughtful tools.',
      createdAt: 1_000,
      name: 'Alex',
      updatedAt: 2_000,
      userId: '7',
      username: 'alex',
    })
    expect(relationshipClient.lookupUser).toHaveBeenCalledWith({ username: 'alex' })
  })

  it('rejects an empty username before calling the API', async () => {
    await expect(lookupUser('   ')).rejects.toThrow('username is invalid')
    expect(relationshipClient.lookupUser).not.toHaveBeenCalled()
  })

  it.each([
    ['outgoing', ProtoRelationshipType.OUTGOING],
    ['incoming', ProtoRelationshipType.INCOMING],
    ['friend', ProtoRelationshipType.FRIEND],
    ['blocked', ProtoRelationshipType.BLOCKED],
  ] as const)('lists %s relationships with an opaque cursor', async (type, protoType) => {
    relationshipClient.listRelationships.mockResolvedValue({
      nextCursor: 'opaque-next',
      relationships: [
        createRelationship({
          targetId: 8n,
          type: protoType,
        }),
      ],
    })

    await expect(listRelationships(type, 'opaque-current')).resolves.toEqual({
      nextCursor: 'opaque-next',
      relationships: [
        {
          createdAt: 3_000,
          profile: {
            avatarAssetId: '9',
            bio: 'Building thoughtful tools.',
            createdAt: 1_000,
            name: 'Alex',
            updatedAt: 2_000,
            userId: '8',
            username: 'alex',
          },
          targetId: '8',
          type,
          updatedAt: 4_000,
        },
      ],
    })
    expect(relationshipClient.listRelationships).toHaveBeenCalledWith({
      cursor: 'opaque-current',
      limit: 50,
      type: protoType,
    })
  })

  it('treats an absent next cursor as the end of the relationship list', async () => {
    relationshipClient.listRelationships.mockResolvedValue({
      nextCursor: '',
      relationships: [],
    })

    await expect(listRelationships('friend')).resolves.toEqual({
      nextCursor: undefined,
      relationships: [],
    })
    expect(relationshipClient.listRelationships).toHaveBeenCalledWith({
      limit: 50,
      type: ProtoRelationshipType.FRIEND,
    })
  })

  it('maps relationship-returning mutations', async () => {
    relationshipClient.sendFriendRequest.mockResolvedValue({
      relationship: createRelationship({
        targetId: 8n,
        type: ProtoRelationshipType.OUTGOING,
      }),
    })
    relationshipClient.acceptFriendRequest.mockResolvedValue({
      relationship: createRelationship({
        targetId: 8n,
        type: ProtoRelationshipType.FRIEND,
      }),
    })
    relationshipClient.blockUser.mockResolvedValue({
      relationship: createRelationship({
        targetId: 8n,
        type: ProtoRelationshipType.BLOCKED,
      }),
    })

    await expect(sendFriendRequest('8')).resolves.toMatchObject({
      targetId: '8',
      type: 'outgoing',
    })
    await expect(acceptFriendRequest('8')).resolves.toMatchObject({
      targetId: '8',
      type: 'friend',
    })
    await expect(blockUser('8')).resolves.toMatchObject({
      targetId: '8',
      type: 'blocked',
    })
    expect(relationshipClient.sendFriendRequest).toHaveBeenCalledWith({ targetId: 8n })
    expect(relationshipClient.acceptFriendRequest).toHaveBeenCalledWith({ targetId: 8n })
    expect(relationshipClient.blockUser).toHaveBeenCalledWith({ targetId: 8n })
  })

  it('maps successful relationship removals', async () => {
    relationshipClient.declineFriendRequest.mockResolvedValue({ ok: true })
    relationshipClient.removeFriend.mockResolvedValue({ ok: true })
    relationshipClient.unblockUser.mockResolvedValue({ ok: true })

    await expect(declineFriendRequest('8')).resolves.toBeUndefined()
    await expect(removeFriend('8')).resolves.toBeUndefined()
    await expect(unblockUser('8')).resolves.toBeUndefined()
    expect(relationshipClient.declineFriendRequest).toHaveBeenCalledWith({ targetId: 8n })
    expect(relationshipClient.removeFriend).toHaveBeenCalledWith({ targetId: 8n })
    expect(relationshipClient.unblockUser).toHaveBeenCalledWith({ targetId: 8n })
  })

  it('rejects invalid user identifiers before relationship mutations', async () => {
    await expect(sendFriendRequest('0')).rejects.toThrow('user id is invalid')
    await expect(acceptFriendRequest('not-an-id')).rejects.toThrow('user id is invalid')
    await expect(declineFriendRequest('-1')).rejects.toThrow('user id is invalid')
    await expect(removeFriend('1.5')).rejects.toThrow('user id is invalid')
    await expect(blockUser('08')).rejects.toThrow('user id is invalid')
    await expect(unblockUser('')).rejects.toThrow('user id is invalid')
    expect(relationshipClient.sendFriendRequest).not.toHaveBeenCalled()
    expect(relationshipClient.acceptFriendRequest).not.toHaveBeenCalled()
    expect(relationshipClient.declineFriendRequest).not.toHaveBeenCalled()
    expect(relationshipClient.removeFriend).not.toHaveBeenCalled()
    expect(relationshipClient.blockUser).not.toHaveBeenCalled()
    expect(relationshipClient.unblockUser).not.toHaveBeenCalled()
  })

  it('rejects incomplete or unsupported relationship responses', async () => {
    relationshipClient.sendFriendRequest.mockResolvedValue({})
    relationshipClient.acceptFriendRequest.mockResolvedValue({
      relationship: createRelationship({
        profile: undefined,
        targetId: 8n,
        type: ProtoRelationshipType.FRIEND,
      }),
    })
    relationshipClient.blockUser.mockResolvedValue({
      relationship: createRelationship({
        targetId: 8n,
        type: ProtoRelationshipType.UNSPECIFIED,
      }),
    })

    await expect(sendFriendRequest('8')).rejects.toThrow(
      'send friend request response was incomplete',
    )
    await expect(acceptFriendRequest('8')).rejects.toThrow('relationship response was incomplete')
    await expect(blockUser('8')).rejects.toThrow('relationship type is invalid')
  })

  it('rejects unsuccessful boolean mutation responses', async () => {
    relationshipClient.declineFriendRequest.mockResolvedValue({ ok: false })
    relationshipClient.removeFriend.mockResolvedValue({ ok: false })
    relationshipClient.unblockUser.mockResolvedValue({ ok: false })

    await expect(declineFriendRequest('8')).rejects.toThrow(
      'friend request decline was not accepted',
    )
    await expect(removeFriend('8')).rejects.toThrow('friend removal was not accepted')
    await expect(unblockUser('8')).rejects.toThrow('user unblock was not accepted')
  })
})

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    avatarAssetId: 9n,
    bio: 'Building thoughtful tools.',
    createdAt: 1_000n,
    name: 'Alex',
    updatedAt: 2_000n,
    userId: 8n,
    username: 'alex',
    ...overrides,
  }
}

function createRelationship(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: 3_000n,
    profile: createProfile(),
    targetId: 8n,
    type: ProtoRelationshipType.FRIEND,
    updatedAt: 4_000n,
    ...overrides,
  }
}
