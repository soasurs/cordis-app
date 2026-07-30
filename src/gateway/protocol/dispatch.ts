import type {
  GuildChannelDeletedPayload,
  GuildChannelOverwriteDeletedPayload,
  GuildChannelOverwritePayload,
  GuildChannelPayload,
  GuildDeletedPayload,
  GuildMemberBannedPayload,
  GuildMemberPayload,
  GuildMemberRemovedPayload,
  GuildMemberRolesUpdatedPayload,
  GuildMemberUnbannedPayload,
  GuildPayload,
  GuildRoleDeletedPayload,
  GuildRolePayload,
} from '@/gateway/protocol/payloads/guild'
import type {
  MessageDeletedPayload,
  MessagePayload,
  MessageReadUpdatedPayload,
} from '@/gateway/protocol/payloads/message'
import type { GatewayReadyData, GatewayResumedData } from '@/gateway/protocol/payloads/ready'
import type {
  DmChannelCreatedPayload,
  PresencePreferenceUpdatedPayload,
  PresenceUpdatedPayload,
  RelationshipPayload,
  RelationshipRemovedPayload,
  SessionReconcilePayload,
} from '@/gateway/protocol/payloads/social'
import type { UserProfilePayload } from '@/gateway/protocol/payloads/user'

/** Maps dispatch `type` strings to payload shapes for typed narrowing. */
export interface GatewayDispatchDataMap {
  ready: GatewayReadyData
  resumed: GatewayResumedData
  'guild.created': GuildPayload
  'guild.updated': GuildPayload
  'guild.deleted': GuildDeletedPayload
  'guild.member.joined': GuildMemberPayload
  'guild.member.updated': GuildMemberPayload
  'guild.member.removed': GuildMemberRemovedPayload
  'guild.member.banned': GuildMemberBannedPayload
  'guild.member.unbanned': GuildMemberUnbannedPayload
  'guild.role.created': GuildRolePayload
  'guild.role.updated': GuildRolePayload
  'guild.role.deleted': GuildRoleDeletedPayload
  'guild.member.roles.updated': GuildMemberRolesUpdatedPayload
  'guild.channel.created': GuildChannelPayload
  'guild.channel.updated': GuildChannelPayload
  'guild.channel.deleted': GuildChannelDeletedPayload
  'guild.channel.overwrite.updated': GuildChannelOverwritePayload
  'guild.channel.overwrite.deleted': GuildChannelOverwriteDeletedPayload
  'message.created': MessagePayload
  'message.updated': MessagePayload
  'message.deleted': MessageDeletedPayload
  'message.read.updated': MessageReadUpdatedPayload
  'relationship.updated': RelationshipPayload
  'relationship.removed': RelationshipRemovedPayload
  'user.profile.updated': UserProfilePayload
  'dm.channel.created': DmChannelCreatedPayload
  'presence.preference.updated': PresencePreferenceUpdatedPayload
  'presence.updated': PresenceUpdatedPayload
  'session.reconcile': SessionReconcilePayload
}

export type GatewayDispatchType = keyof GatewayDispatchDataMap

export interface GatewayDispatch<T = unknown> {
  type: string
  sequence: number
  data: T
}

/** Distributive mapped type so `isGatewayDispatch` can narrow `data` by `type`. */
export type KnownGatewayDispatch<K extends GatewayDispatchType = GatewayDispatchType> = {
  [P in K]: GatewayDispatch<GatewayDispatchDataMap[P]> & { type: P }
}[K]

export function isGatewayDispatch<K extends GatewayDispatchType>(
  dispatch: GatewayDispatch,
  type: K,
): dispatch is KnownGatewayDispatch<K> {
  return dispatch.type === type
}
