import type {
  Guild as GuildMessage,
  GuildInvite as GuildInviteMessage,
  GuildInvitePreview as GuildInvitePreviewMessage,
  GuildMember as GuildMemberMessage,
} from '@/gen/api/v1/guild_pb'

import { toPublicUserProfile } from '@/api/user'
import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import { optionalIdempotencyKey } from '@/api/idempotency'
import type {
  CreateGuildInviteDetails,
  Guild,
  GuildInvite,
  GuildInvitePage,
  GuildInvitePreview,
  GuildMember,
  JoinGuildByInviteResult,
} from '@/api/guild/types'

export async function listGuildInvites(guildId: string, cursor?: string): Promise<GuildInvitePage> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.listGuildInvites({
    ...(cursor ? { cursor } : {}),
    guildId: BigInt(guildId),
    limit: 50,
  })

  return {
    invites: response.invites.map(toGuildInvite),
    // Opaque next_cursor must be passed through unchanged. Field absence
    // (or an empty string) means there is no next page.
    nextCursor: response.nextCursor || undefined,
  }
}

export async function createGuildInvite(
  guildId: string,
  details: CreateGuildInviteDetails,
): Promise<GuildInvite> {
  assertIdentifier(guildId, 'guild')
  if (!Number.isInteger(details.maxUses) || details.maxUses < 0) {
    throw new Error('max uses is invalid')
  }
  if (!Number.isInteger(details.expiresInMs) || details.expiresInMs < 0) {
    throw new Error('expires in ms is invalid')
  }

  const response = await guildClient.createGuildInvite({
    expiresInMs: BigInt(details.expiresInMs),
    guildId: BigInt(guildId),
    maxUses: details.maxUses,
    ...optionalIdempotencyKey(details.idempotencyKey),
  })

  if (!response.invite) {
    throw new Error('create guild invite response was incomplete')
  }

  return toGuildInvite(response.invite)
}

export async function getGuildInvite(code: string): Promise<GuildInvitePreview> {
  const trimmed = code.trim()
  if (!trimmed) {
    throw new Error('invite code is invalid')
  }

  const response = await guildClient.getGuildInvite({ code: trimmed })

  if (!response.preview) {
    throw new Error('get guild invite response was incomplete')
  }

  return toGuildInvitePreview(response.preview)
}

export async function joinGuildByInvite(code: string): Promise<JoinGuildByInviteResult> {
  const trimmed = code.trim()
  if (!trimmed) {
    throw new Error('invite code is invalid')
  }

  const response = await guildClient.joinGuildByInvite({ code: trimmed })

  if (!response.guild || !response.member) {
    throw new Error('join guild by invite response was incomplete')
  }

  return {
    guild: toGuild(response.guild),
    member: toGuildMember(response.member),
  }
}

export async function deleteGuildInvite(code: string): Promise<void> {
  const trimmed = code.trim()
  if (!trimmed) {
    throw new Error('invite code is invalid')
  }

  const response = await guildClient.deleteGuildInvite({ code: trimmed })

  if (!response.ok) {
    throw new Error('delete guild invite was not accepted')
  }
}

function toGuildInvite(invite: GuildInviteMessage): GuildInvite {
  return {
    code: invite.code,
    createdAt: Number(invite.createdAt),
    creator: invite.creator ? toPublicUserProfile(invite.creator) : undefined,
    creatorUserId: invite.creatorUserId.toString(),
    expiresAt: Number(invite.expiresAt),
    guildId: invite.guildId.toString(),
    id: invite.id.toString(),
    maxUses: invite.maxUses,
    uses: invite.uses,
  }
}

function toGuildInvitePreview(preview: GuildInvitePreviewMessage): GuildInvitePreview {
  return {
    code: preview.code,
    expiresAt: Number(preview.expiresAt),
    guildDescription: preview.guildDescription,
    guildIconAssetId: preview.guildIconAssetId.toString(),
    guildId: preview.guildId.toString(),
    guildName: preview.guildName,
    memberCount: Number(preview.memberCount),
  }
}

function toGuild(guild: GuildMessage): Guild {
  return {
    createdAt: Number(guild.createdAt),
    description: guild.description,
    iconAssetId: guild.iconAssetId.toString(),
    id: guild.id.toString(),
    name: guild.name,
    ownerId: guild.ownerId.toString(),
    revision: Number(guild.revision),
    updatedAt: Number(guild.updatedAt),
  }
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
