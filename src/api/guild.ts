import { createClient } from '@connectrpc/connect'

import {
  GuildPermission,
  GuildService,
  type GuildMember as GuildMemberMessage,
} from '@/gen/api/v1/guild_pb'

import { apiTransport } from './client'
import { toPublicUserProfile, type PublicUserProfile } from './user'

const guildClient = createClient(GuildService, apiTransport)

export const guildPermission = {
  administrator: String(GuildPermission.ADMINISTRATOR),
  banMembers: String(GuildPermission.BAN_MEMBERS),
  createInvite: String(GuildPermission.CREATE_INVITE),
  kickMembers: String(GuildPermission.KICK_MEMBERS),
  manageChannels: String(GuildPermission.MANAGE_CHANNELS),
  manageGuild: String(GuildPermission.MANAGE_GUILD),
  manageMembers: String(GuildPermission.MANAGE_MEMBERS),
  manageMessages: String(GuildPermission.MANAGE_MESSAGES),
  manageRoles: String(GuildPermission.MANAGE_ROLES),
  sendMessages: String(GuildPermission.SEND_MESSAGES),
  viewChannel: String(GuildPermission.VIEW_CHANNEL),
} as const

export interface Guild {
  createdAt: number
  iconAssetId: string
  id: string
  name: string
  ownerId: string
  revision: number
  updatedAt: number
}

export interface GuildChannel {
  guildId: string
  id: string
  name: string
  parentId?: string
  position: number
  revision: number
  topic: string
  type: number
}

export interface GuildMember {
  guildId: string
  joinedAt: number
  nickname: string
  profile?: PublicUserProfile
  revision: number
  updatedAt: number
  userId: string
}

export interface GuildMemberPage {
  members: GuildMember[]
  nextCursor?: string
}

export interface GuildRole {
  createdAt: number
  guildId: string
  id: string
  isDefault: boolean
  name: string
  permissions: string
  position: number
  revision: number
  updatedAt: number
}

export interface GuildRoleDetails {
  name: string
  permissions: string
}

export interface GuildRolePosition {
  position: number
  roleId: string
}

interface CreateTextOrVoiceGuildChannelDetails {
  guildId: string
  name: string
  parentId?: string
  type: 'text' | 'voice'
}

interface CreateGuildCategoryDetails {
  guildId: string
  name: string
  parentId?: never
  type: 'category'
}

export type CreateGuildChannelDetails =
  CreateTextOrVoiceGuildChannelDetails | CreateGuildCategoryDetails

export interface GuildChannelPosition {
  channelId: string
  parentId?: string | null
  position: number
}

export async function createGuild(name: string): Promise<Guild> {
  const response = await guildClient.createGuild({ name })

  if (!response.guild) {
    throw new Error('create guild response was incomplete')
  }

  return toGuild(response.guild)
}

export async function updateGuild(guildId: string, name: string): Promise<Guild> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.updateGuild({ guildId: BigInt(guildId), name })

  if (!response.guild) {
    throw new Error('update guild response was incomplete')
  }

  return toGuild(response.guild)
}

export async function listGuildChannels(guildId: string): Promise<GuildChannel[]> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.listGuildChannels({ guildId: BigInt(guildId) })

  return response.channels.map(toGuildChannel)
}

export async function listGuildMembers(
  guildId: string,
  cursor?: string,
): Promise<GuildMemberPage> {
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

export async function listGuildRoles(guildId: string): Promise<GuildRole[]> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.listGuildRoles({ guildId: BigInt(guildId) })

  return response.roles.map(toGuildRole)
}

export async function createGuildRole(
  guildId: string,
  details: GuildRoleDetails,
): Promise<GuildRole> {
  assertIdentifier(guildId, 'guild')
  const permissions = parsePermissions(details.permissions)

  const response = await guildClient.createGuildRole({
    guildId: BigInt(guildId),
    name: details.name,
    permissions,
  })

  if (!response.role) {
    throw new Error('create guild role response was incomplete')
  }

  return toGuildRole(response.role)
}

export async function updateGuildRole(
  guildId: string,
  roleId: string,
  details: GuildRoleDetails,
): Promise<GuildRole> {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(roleId, 'role')
  const permissions = parsePermissions(details.permissions)

  const response = await guildClient.updateGuildRole({
    guildId: BigInt(guildId),
    name: details.name,
    permissions,
    roleId: BigInt(roleId),
  })

  if (!response.role) {
    throw new Error('update guild role response was incomplete')
  }

  return toGuildRole(response.role)
}

export async function deleteGuildRole(guildId: string, roleId: string): Promise<void> {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(roleId, 'role')

  const response = await guildClient.deleteGuildRole({
    guildId: BigInt(guildId),
    roleId: BigInt(roleId),
  })

  if (!response.ok) {
    throw new Error('delete guild role was not accepted')
  }
}

export async function reorderGuildRoles(
  guildId: string,
  positions: GuildRolePosition[],
): Promise<GuildRole[]> {
  assertIdentifier(guildId, 'guild')
  for (const item of positions) {
    assertIdentifier(item.roleId, 'role')
    if (!Number.isInteger(item.position) || item.position < 0) {
      throw new Error('role position is invalid')
    }
  }

  const response = await guildClient.reorderGuildRoles({
    guildId: BigInt(guildId),
    positions: positions.map((item) => ({
      position: item.position,
      roleId: BigInt(item.roleId),
    })),
  })

  return response.roles.map(toGuildRole)
}

export async function listGuildMemberRoles(guildId: string, userId: string): Promise<GuildRole[]> {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(userId, 'user')

  const response = await guildClient.listGuildMemberRoles({
    guildId: BigInt(guildId),
    userId: BigInt(userId),
  })

  return response.roles.map(toGuildRole)
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

export async function createGuildChannel(
  details: CreateGuildChannelDetails,
): Promise<GuildChannel> {
  assertIdentifier(details.guildId, 'guild')
  if (details.parentId) assertIdentifier(details.parentId, 'parent channel')

  const type = { category: 2, text: 1, voice: 3 }[details.type]

  const response = await guildClient.createGuildChannel({
    guildId: BigInt(details.guildId),
    name: details.name,
    parentId: details.parentId ? BigInt(details.parentId) : 0n,
    topic: '',
    type,
  })

  if (!response.channel) {
    throw new Error('create guild channel response was incomplete')
  }

  return toGuildChannel(response.channel)
}

export async function reorderGuildChannels(
  guildId: string,
  positions: GuildChannelPosition[],
): Promise<GuildChannel[]> {
  assertIdentifier(guildId, 'guild')
  for (const item of positions) {
    assertIdentifier(item.channelId, 'channel')
    if (item.parentId) assertIdentifier(item.parentId, 'parent channel')
    if (!Number.isInteger(item.position) || item.position < 0) {
      throw new Error('channel position is invalid')
    }
  }

  const response = await guildClient.reorderGuildChannels({
    guildId: BigInt(guildId),
    positions: positions.map((item) => ({
      channelId: BigInt(item.channelId),
      ...(item.parentId !== undefined
        ? { parentId: item.parentId === null ? 0n : BigInt(item.parentId) }
        : {}),
      position: item.position,
    })),
  })

  return response.channels.map(toGuildChannel)
}

function toGuildChannel(channel: {
  guildId: bigint
  id: bigint
  name: string
  parentId: bigint
  position: number
  revision: bigint
  topic: string
  type: number
}): GuildChannel {
  return {
    guildId: channel.guildId.toString(),
    id: channel.id.toString(),
    name: channel.name,
    parentId: channel.parentId > 0n ? channel.parentId.toString() : undefined,
    position: channel.position,
    revision: Number(channel.revision),
    topic: channel.topic,
    type: channel.type,
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

function toGuildRole(role: {
  createdAt: bigint
  guildId: bigint
  id: bigint
  isDefault: boolean
  name: string
  permissions: bigint
  position: number
  revision: bigint
  updatedAt: bigint
}): GuildRole {
  return {
    createdAt: Number(role.createdAt),
    guildId: role.guildId.toString(),
    id: role.id.toString(),
    isDefault: role.isDefault,
    name: role.name,
    permissions: role.permissions.toString(),
    position: role.position,
    revision: Number(role.revision),
    updatedAt: Number(role.updatedAt),
  }
}

function toGuild(guild: {
  createdAt: bigint
  iconAssetId: bigint
  id: bigint
  name: string
  ownerId: bigint
  revision: bigint
  updatedAt: bigint
}): Guild {
  return {
    createdAt: Number(guild.createdAt),
    iconAssetId: guild.iconAssetId.toString(),
    id: guild.id.toString(),
    name: guild.name,
    ownerId: guild.ownerId.toString(),
    revision: Number(guild.revision),
    updatedAt: Number(guild.updatedAt),
  }
}

function assertIdentifier(value: string, field: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${field} id is invalid`)
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

function parsePermissions(value: string) {
  try {
    const permissions = BigInt(value)
    if (permissions < 0n || permissions > (1n << 64n) - 1n) {
      throw new Error('role permissions are invalid')
    }
    return permissions
  } catch {
    throw new Error('role permissions are invalid')
  }
}
