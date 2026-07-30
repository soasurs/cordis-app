import { createClient } from '@connectrpc/connect'

import {
  PresenceService,
  PresenceStatus,
  type Presence as PresenceMessage,
} from '@/gen/api/v1/presence_pb'

import { apiTransport } from '@/api/client'

const presenceClient = createClient(PresenceService, apiTransport)

export const presenceResolutionLimit = 100

export type UserPresenceStatus = 'offline' | 'online' | 'idle' | 'dnd'

export interface UserPresence {
  lastSeenAt: number
  status: UserPresenceStatus
  userId: string
  version: bigint
}

export interface PresenceResolution {
  presences: UserPresence[]
  requestedUserIds: string[]
}

export async function resolveUsersPresence(userIds: string[]): Promise<PresenceResolution> {
  const requestedUserIds = normalizePresenceUserIds(userIds)
  if (requestedUserIds.length === 0) {
    return { presences: [], requestedUserIds }
  }

  const response = await presenceClient.resolveUsersPresence({
    userIds: requestedUserIds.map((userId) => BigInt(userId)),
  })

  return {
    presences: response.presences.map(toUserPresence),
    requestedUserIds,
  }
}

export function normalizePresenceUserIds(userIds: string[]): string[] {
  const uniqueUserIds = new Set<string>()
  for (const userId of userIds) {
    if (!/^[1-9]\d*$/.test(userId)) {
      throw new Error('presence user id is invalid')
    }
    uniqueUserIds.add(userId)
  }
  if (uniqueUserIds.size > presenceResolutionLimit) {
    throw new Error(`at most ${presenceResolutionLimit} unique presence user ids are allowed`)
  }
  return [...uniqueUserIds]
}

function toUserPresence(presence: PresenceMessage): UserPresence {
  if (presence.version <= 0n) {
    throw new Error('presence version is invalid')
  }

  return {
    lastSeenAt: Number(presence.lastSeenAt),
    status: toUserPresenceStatus(presence.status),
    userId: presence.userId.toString(),
    version: presence.version,
  }
}

function toUserPresenceStatus(status: PresenceStatus): UserPresenceStatus {
  switch (status) {
    case PresenceStatus.OFFLINE:
      return 'offline'
    case PresenceStatus.ONLINE:
      return 'online'
    case PresenceStatus.IDLE:
      return 'idle'
    case PresenceStatus.DND:
      return 'dnd'
    default:
      throw new Error('presence status is invalid')
  }
}
