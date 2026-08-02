import type { GatewayReadyData, ReadyChannel, ReadyPermissionOverwrite, ReadyRole } from '@/gateway'
import type {
  GuildChannelOverwriteSummary,
  GuildChannelSummary,
  GuildRoleSummary,
  GuildSummary,
} from '@/features/guilds/guild-query-types'

export function toGuildSummary(guild: GatewayReadyData['guilds'][number]): GuildSummary {
  return {
    createdAt: guild.created_at,
    description: guild.description,
    iconAssetId: guild.icon_asset_id,
    id: guild.id,
    name: guild.name,
    ownerId: guild.owner_id,
    revision: guild.revision,
    updatedAt: guild.updated_at,
  }
}

export function toChannelSummary(channel: ReadyChannel): GuildChannelSummary {
  return {
    guildId: channel.guild_id,
    id: channel.id,
    name: channel.name,
    parentId: channel.parent_id && channel.parent_id !== '0' ? channel.parent_id : undefined,
    position: channel.position,
    revision: channel.revision,
    topic: channel.topic,
    type: channel.type,
  }
}

export function toRoleSummary(role: ReadyRole): GuildRoleSummary {
  return {
    createdAt: role.created_at,
    guildId: role.guild_id,
    id: role.id,
    isDefault: role.is_default,
    name: role.name,
    permissions: role.permissions,
    position: role.position,
    revision: role.revision,
    updatedAt: role.updated_at,
  }
}

export function toOverwriteSummary(
  overwrite: ReadyPermissionOverwrite,
): GuildChannelOverwriteSummary {
  return {
    allow: overwrite.allow,
    appliesTo: toOverwriteAppliesTo(overwrite.applies_to),
    appliesToId: overwrite.applies_to_id,
    channelId: overwrite.channel_id,
    createdAt: overwrite.created_at,
    deny: overwrite.deny,
    guildId: overwrite.guild_id,
    revision: overwrite.revision,
    updatedAt: overwrite.updated_at,
  }
}

export function toOverwriteAppliesTo(value: number): GuildChannelOverwriteSummary['appliesTo'] {
  if (value === 1) return 'role'
  if (value === 2) return 'member'
  throw new Error('permission overwrite applies_to is invalid')
}
