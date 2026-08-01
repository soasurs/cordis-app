import type {
  GuildMember as GuildMemberMessage,
  GuildMentionUser as GuildMentionUserMessage,
} from '@/gen/api/v1/guild_pb'

import { toPublicUserProfile } from '@/api/user'
import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import type { GuildMember, GuildMemberPage, GuildMentionUser } from '@/api/guild/types'

const GUILD_MENTION_SEARCH_LIMIT = 20

export async function listGuildMembers(guildId: string, cursor?: string): Promise<GuildMemberPage> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.listGuildMembers({
    ...(cursor ? { cursor } : {}),
    guildId: BigInt(guildId),
    limit: 50,
  })

  return {
    members: response.members.map(toGuildMember),
    // Opaque next_cursor must be passed through unchanged. Field absence
    // (or an empty string) means there is no next page.
    nextCursor: response.nextCursor || undefined,
  }
}

export async function searchGuildMentionUsers(
  guildId: string,
  channelId: string,
  query: string,
): Promise<GuildMentionUser[]> {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(channelId, 'channel')

  const response = await guildClient.searchGuildMentionUsers({
    channelId: BigInt(channelId),
    guildId: BigInt(guildId),
    limit: GUILD_MENTION_SEARCH_LIMIT,
    query,
  })

  return response.users.map(toGuildMentionUser)
}

export async function listGuildRoleMembers(
  guildId: string,
  roleId: string,
  cursor?: string,
): Promise<GuildMemberPage> {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(roleId, 'role')

  const response = await guildClient.listGuildRoleMembers({
    ...(cursor ? { cursor } : {}),
    guildId: BigInt(guildId),
    limit: 50,
    roleId: BigInt(roleId),
  })

  return {
    members: response.members.map(toGuildMember),
    nextCursor: response.nextCursor || undefined,
  }
}

export async function addGuildMemberRole(
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  await updateGuildMemberRole('add', guildId, userId, roleId)
}

export async function removeGuildMemberRole(
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  await updateGuildMemberRole('remove', guildId, userId, roleId)
}

export async function addGuildRoleMembers(
  guildId: string,
  roleId: string,
  userIds: string[],
): Promise<void> {
  await updateGuildRoleMembers('add', guildId, roleId, userIds)
}

export async function removeGuildRoleMembers(
  guildId: string,
  roleId: string,
  userIds: string[],
): Promise<void> {
  await updateGuildRoleMembers('remove', guildId, roleId, userIds)
}

function toGuildMember(member: GuildMemberMessage): GuildMember {
  return {
    guildId: member.guildId.toString(),
    joinedAt: Number(member.joinedAt),
    nickname: member.nickname,
    profile: member.profile ? toPublicUserProfile(member.profile) : undefined,
    revision: Number(member.revision),
    updatedAt: Number(member.updatedAt),
    userId: member.userId.toString(),
  }
}

function toGuildMentionUser(user: GuildMentionUserMessage): GuildMentionUser {
  return {
    avatarAssetId: user.avatarAssetId.toString(),
    name: user.name,
    nickname: user.nickname,
    userId: user.userId.toString(),
    username: user.username,
  }
}

async function updateGuildMemberRole(
  operation: 'add' | 'remove',
  guildId: string,
  userId: string,
  roleId: string,
) {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(userId, 'user')
  assertIdentifier(roleId, 'role')

  const request = {
    guildId: BigInt(guildId),
    roleId: BigInt(roleId),
    userId: BigInt(userId),
  }
  const response =
    operation === 'add'
      ? await guildClient.addGuildMemberRole(request)
      : await guildClient.removeGuildMemberRole(request)

  if (!response.ok) {
    throw new Error(`${operation} guild member role was not accepted`)
  }
}

async function updateGuildRoleMembers(
  operation: 'add' | 'remove',
  guildId: string,
  roleId: string,
  userIds: string[],
) {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(roleId, 'role')
  if (userIds.length === 0) {
    throw new Error('at least one user id is required')
  }
  if (userIds.length > 100) {
    throw new Error('at most 100 user ids are allowed')
  }
  for (const userId of userIds) {
    assertIdentifier(userId, 'user')
  }

  const request = {
    guildId: BigInt(guildId),
    roleId: BigInt(roleId),
    userIds: userIds.map((userId) => BigInt(userId)),
  }
  const response =
    operation === 'add'
      ? await guildClient.addGuildRoleMembers(request)
      : await guildClient.removeGuildRoleMembers(request)

  if (!response.ok) {
    throw new Error(`${operation} guild role members was not accepted`)
  }
}
