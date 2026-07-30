import {
  RelationshipType as ProtoRelationshipType,
  type Relationship as ProtoRelationship,
} from '@/gen/api/v1/user_pb'

import { relationshipClient } from '@/api/relationship/client'
import { assertUserIdentifier } from '@/api/relationship/internal'
import type {
  RelationshipPage,
  RelationshipSummary,
  RelationshipType,
} from '@/api/relationship/types'
import { toPublicUserProfile, type PublicUserProfile } from '@/api/user'

const RELATIONSHIP_LIST_LIMIT = 50

export async function lookupUser(username: string): Promise<PublicUserProfile> {
  const normalizedUsername = username.trim()
  if (!normalizedUsername) {
    throw new Error('username is invalid')
  }

  const response = await relationshipClient.lookupUser({ username: normalizedUsername })
  if (!response.profile) {
    throw new Error('lookup user response was incomplete')
  }
  return toPublicUserProfile(response.profile)
}

export async function listRelationships(
  type: RelationshipType,
  cursor?: string,
): Promise<RelationshipPage> {
  const response = await relationshipClient.listRelationships({
    ...(cursor ? { cursor } : {}),
    limit: RELATIONSHIP_LIST_LIMIT,
    type: toProtoRelationshipType(type),
  })

  return {
    nextCursor: response.nextCursor || undefined,
    relationships: response.relationships.map(toRelationshipSummary),
  }
}

export async function sendFriendRequest(targetId: string): Promise<RelationshipSummary> {
  assertUserIdentifier(targetId)
  const response = await relationshipClient.sendFriendRequest({ targetId: BigInt(targetId) })
  return requireRelationship(response.relationship, 'send friend request')
}

export async function acceptFriendRequest(targetId: string): Promise<RelationshipSummary> {
  assertUserIdentifier(targetId)
  const response = await relationshipClient.acceptFriendRequest({ targetId: BigInt(targetId) })
  return requireRelationship(response.relationship, 'accept friend request')
}

export async function declineFriendRequest(targetId: string): Promise<void> {
  assertUserIdentifier(targetId)
  const response = await relationshipClient.declineFriendRequest({ targetId: BigInt(targetId) })
  if (!response.ok) {
    throw new Error('friend request decline was not accepted')
  }
}

export async function removeFriend(targetId: string): Promise<void> {
  assertUserIdentifier(targetId)
  const response = await relationshipClient.removeFriend({ targetId: BigInt(targetId) })
  if (!response.ok) {
    throw new Error('friend removal was not accepted')
  }
}

export async function blockUser(targetId: string): Promise<RelationshipSummary> {
  assertUserIdentifier(targetId)
  const response = await relationshipClient.blockUser({ targetId: BigInt(targetId) })
  return requireRelationship(response.relationship, 'block user')
}

export async function unblockUser(targetId: string): Promise<void> {
  assertUserIdentifier(targetId)
  const response = await relationshipClient.unblockUser({ targetId: BigInt(targetId) })
  if (!response.ok) {
    throw new Error('user unblock was not accepted')
  }
}

export function toRelationshipSummary(relationship: ProtoRelationship): RelationshipSummary {
  if (!relationship.profile) {
    throw new Error('relationship response was incomplete')
  }

  return {
    createdAt: Number(relationship.createdAt),
    profile: toPublicUserProfile(relationship.profile),
    targetId: relationship.targetId.toString(),
    type: fromProtoRelationshipType(relationship.type),
    updatedAt: Number(relationship.updatedAt),
  }
}

function requireRelationship(
  relationship: ProtoRelationship | undefined,
  operation: string,
): RelationshipSummary {
  if (!relationship) {
    throw new Error(`${operation} response was incomplete`)
  }
  return toRelationshipSummary(relationship)
}

function toProtoRelationshipType(type: RelationshipType): ProtoRelationshipType {
  switch (type) {
    case 'outgoing':
      return ProtoRelationshipType.OUTGOING
    case 'incoming':
      return ProtoRelationshipType.INCOMING
    case 'friend':
      return ProtoRelationshipType.FRIEND
    case 'blocked':
      return ProtoRelationshipType.BLOCKED
  }
}

function fromProtoRelationshipType(type: ProtoRelationshipType): RelationshipType {
  switch (type) {
    case ProtoRelationshipType.OUTGOING:
      return 'outgoing'
    case ProtoRelationshipType.INCOMING:
      return 'incoming'
    case ProtoRelationshipType.FRIEND:
      return 'friend'
    case ProtoRelationshipType.BLOCKED:
      return 'blocked'
    default:
      throw new Error('relationship type is invalid')
  }
}
