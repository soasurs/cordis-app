export const GatewayOpcode = {
  Dispatch: 0,
  Heartbeat: 1,
  Identify: 2,
  Presence: 3,
  Resume: 6,
  Reconnect: 7,
  InvalidSession: 9,
  Hello: 10,
  HeartbeatAck: 11,
  Error: 4000,
} as const

export type GatewayOpcode = (typeof GatewayOpcode)[keyof typeof GatewayOpcode]

export interface GatewayEnvelope<T = unknown> {
  op: number
  s?: number
  t?: string
  d?: T
}

export interface GatewayHelloData {
  heartbeat_interval_ms: number
  gateway_id: string
}

export interface GatewayIdentifyData {
  token: string
  device_type?: string
  status?: string
  client_state?: string
}

export interface GatewayResumeData {
  token: string
  session_id: string
  seq: number
}

export interface GatewayPresenceData {
  status?: string
  client_state?: string
}

export interface GatewayErrorData {
  code: string
  message: string
}

export interface ReadyRole {
  id: string
  guild_id: string
  name: string
  permissions: string
  position: number
  is_default: boolean
  revision: number
  created_at: number
  updated_at: number
}

export interface ReadyChannel {
  id: string
  guild_id: string
  name: string
  type: number
  position: number
  topic: string
  revision: number
  created_at: number
  updated_at: number
  parent_id?: string
}

export interface ReadyPermissionOverwrite {
  channel_id: string
  guild_id: string
  target_type: number
  target_id: string
  allow: string
  deny: string
  revision: number
  created_at: number
  updated_at: number
}

export interface ReadyGuild {
  id: string
  owner_id: string
  name: string
  icon_asset_id: string
  revision: number
  access_revision: number
  created_at: number
  updated_at: number
  roles: ReadyRole[]
  member_role_ids: string[]
  channels: ReadyChannel[]
  permission_overwrites: ReadyPermissionOverwrite[]
}

export interface ReadyDmChannel {
  id: string
  recipient_id: string
  created_at: number
}

export interface ReadyReadState {
  channel_id: string
  last_message_id: string
  last_read_message_id: string
  mention_count: number
}

export interface GatewayReadyData {
  user_id: string
  auth_session_id: string
  session_id: string
  session_node_id: string
  access_token_expires_at: number
  guilds: ReadyGuild[]
  dm_channels: ReadyDmChannel[]
  read_states: ReadyReadState[]
}

export interface GatewayResumedData {
  session_id: string
}

export interface GuildPayload {
  id: string
  owner_id: string
  name: string
  icon_asset_id: string
  revision: number
  created_at: number
  updated_at: number
}

export interface GuildDeletedPayload {
  id: string
  revision: number
  deleted_at: number
}

export interface GuildMemberPayload {
  guild_id: string
  user_id: string
  nickname: string
  revision: number
  joined_at: number
  updated_at: number
}

export interface GuildMemberRemovedPayload {
  guild_id: string
  user_id: string
  revision: number
  removed_at: number
}

export interface GuildMemberBannedPayload {
  guild_id: string
  user_id: string
  actor_user_id: string
  reason: string
  banned_at: number
}

export interface GuildMemberUnbannedPayload {
  guild_id: string
  user_id: string
  unbanned_at: number
}

export type GuildRolePayload = ReadyRole

export interface GuildRoleDeletedPayload {
  id: string
  guild_id: string
  revision: number
  deleted_at: number
}

export interface GuildMemberRolesUpdatedPayload {
  guild_id: string
  user_id: string
  role_ids: string[]
  updated_at: number
}

export type GuildChannelPayload = Required<ReadyChannel>

export interface GuildChannelDeletedPayload {
  id: string
  guild_id: string
  revision: number
  deleted_at: number
}

export interface GuildChannelOverwritePayload {
  channel_id: string
  guild_id: string
  target_type: number
  target_id: string
  allow: string
  deny: string
  revision: number
  updated_at: number
}

export interface GuildChannelOverwriteDeletedPayload {
  channel_id: string
  guild_id: string
  target_type: number
  target_id: string
}

export interface MessageAuthorPayload {
  user_id: string
  name: string
  avatar_asset_id: string
  created_at: number
  updated_at: number
  username: string
}

export interface MessageAttachmentPayload {
  asset_id: string
  filename: string
  size: number
  content_type: string
  width: number
  height: number
  url: string
  url_expires_at: number
}

export interface MessagePayload {
  id: string
  guild_id?: string
  channel_id: string
  user_id?: string
  author: MessageAuthorPayload
  content: string
  type: number
  flags: number
  referenced_message_id?: string
  referenced_channel_id?: string
  attachments: MessageAttachmentPayload[]
  mention_user_ids: string[]
  previous_mention_user_ids?: string[]
  edited_at: number
  created_at: number
  updated_at: number
  revision: number
}

export interface MessageDeletedPayload {
  id: string
  guild_id?: string
  channel_id: string
  user_id?: string
  revision: number
  deleted_at: number
  last_message_id: string
  mention_user_ids: string[]
}

export interface MessageReadUpdatedPayload {
  user_id: string
  channel_id: string
  last_message_id: string
  last_read_message_id: string
  mention_count: number
}

export interface RelationshipPayload {
  user_id: string
  target_id: string
  type: number
  created_at: number
  updated_at: number
}

export interface RelationshipRemovedPayload {
  user_id: string
  target_id: string
}

export interface DmChannelCreatedPayload {
  channel_id: string
  user_id: string
  recipient_id: string
  created_at: number
}

export interface PresenceUpdatedPayload {
  user_id: string
  status: number
  changed_at: number
  guild_ids: string[]
}

export interface SessionReconcilePayload {
  guild_id: string
  channel_id: string
}

export interface GatewayDispatchDataMap {
  READY: GatewayReadyData
  RESUMED: GatewayResumedData
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
  'dm.channel.created': DmChannelCreatedPayload
  'presence.updated': PresenceUpdatedPayload
  'session.reconcile': SessionReconcilePayload
}

export type GatewayDispatchType = keyof GatewayDispatchDataMap

export interface GatewayDispatch<T = unknown> {
  type: string
  sequence: number
  data: T
}

export type KnownGatewayDispatch<K extends GatewayDispatchType = GatewayDispatchType> = {
  [P in K]: GatewayDispatch<GatewayDispatchDataMap[P]> & { type: P }
}[K]

export function isGatewayDispatch<K extends GatewayDispatchType>(
  dispatch: GatewayDispatch,
  type: K,
): dispatch is KnownGatewayDispatch<K> {
  return dispatch.type === type
}

export function parseGatewayEnvelope(value: string): GatewayEnvelope {
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed) || typeof parsed.op !== 'number' || !Number.isInteger(parsed.op)) {
    throw new Error('gateway envelope opcode is invalid')
  }
  if (
    parsed.s !== undefined &&
    (typeof parsed.s !== 'number' || !Number.isSafeInteger(parsed.s) || parsed.s < 0)
  ) {
    throw new Error('gateway envelope sequence is invalid')
  }
  if (parsed.t !== undefined && typeof parsed.t !== 'string') {
    throw new Error('gateway envelope type is invalid')
  }
  return parsed as unknown as GatewayEnvelope
}

export function parseHelloData(value: unknown): GatewayHelloData {
  if (
    !isRecord(value) ||
    typeof value.heartbeat_interval_ms !== 'number' ||
    !Number.isSafeInteger(value.heartbeat_interval_ms) ||
    value.heartbeat_interval_ms <= 0 ||
    typeof value.gateway_id !== 'string'
  ) {
    throw new Error('gateway HELLO payload is invalid')
  }
  return value as unknown as GatewayHelloData
}

export function getReadySessionId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.session_id !== 'string' || value.session_id.length === 0) {
    return null
  }
  return value.session_id
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
