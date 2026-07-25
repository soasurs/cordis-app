import type { GuildMember as GuildMemberMessage } from '@/gen/api/v1/guild_pb'

import { toPublicUserProfile } from '@/api/user'
import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import type { GuildMember, GuildMemberPage } from '@/api/guild/types'

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
