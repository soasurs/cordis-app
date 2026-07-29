import { useQuery } from '@tanstack/react-query'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import {
  canGuildCapability,
  resolveEffectiveGuildPermissions,
  type EffectiveGuildPermissions,
  type GuildCapability,
} from '@/features/guilds/guild-capabilities'
import {
  guildMemberRolesQueryOptions,
  guildRolesQueryOptions,
  guildsQueryOptions,
} from '@/features/guilds/guild-queries'

export type GuildOwnershipState = { status: 'pending' } | { isOwner: boolean; status: 'ready' }

export type GuildPermissionsState =
  { status: 'pending' } | ({ status: 'ready' } & EffectiveGuildPermissions)

/** Resolves whether the current user owns the guild (session + guild list only). */
export function useGuildOwnership(guildId: string): GuildOwnershipState {
  const { data: session } = useQuery(authSessionQueryOptions)
  const { data: guilds } = useQuery(guildsQueryOptions)
  const userId = session?.user.userId.toString()
  const guild = guilds?.find((item) => item.id === guildId)

  if (!userId || !guild) return { status: 'pending' }
  return { isOwner: guild.ownerId === userId, status: 'ready' }
}

/**
 * Resolves the current member's effective guild permissions (ownership + role
 * OR). Owners skip role fetches because ownership already grants every
 * capability. Non-owners read guild/member role caches (hydrated from READY and
 * kept live via gateway role events).
 */
export function useGuildPermissions(guildId: string): GuildPermissionsState {
  const ownership = useGuildOwnership(guildId)
  const { data: session } = useQuery(authSessionQueryOptions)
  const userId = session?.user.userId.toString()
  const isOwner = ownership.status === 'ready' && ownership.isOwner
  const rolesQuery = useQuery({
    ...guildRolesQueryOptions(guildId),
    enabled: Boolean(userId) && ownership.status === 'ready' && !isOwner,
  })
  const memberRolesQuery = useQuery({
    ...guildMemberRolesQueryOptions(guildId, userId ?? ''),
    enabled: Boolean(userId) && ownership.status === 'ready' && !isOwner,
  })

  if (ownership.status !== 'ready') return { status: 'pending' }
  if (ownership.isOwner) return { isOwner: true, permissions: '0', status: 'ready' }
  if (!rolesQuery.isSuccess || !memberRolesQuery.isSuccess) return { status: 'pending' }

  return {
    status: 'ready',
    ...resolveEffectiveGuildPermissions({
      assignedRoles: memberRolesQuery.data,
      guildRoles: rolesQuery.data,
      isOwner: false,
    }),
  }
}

function capabilityFromState(permissions: GuildPermissionsState, capability: GuildCapability) {
  if (permissions.status !== 'ready') return false
  return canGuildCapability(permissions, capability)
}

/** True when the current member may perform the capability; false while loading. */
export function useGuildCapability(guildId: string, capability: GuildCapability) {
  const permissions = useGuildPermissions(guildId)
  return capabilityFromState(permissions, capability)
}

/**
 * Resolve ownership + permissions once, then check multiple capabilities without
 * re-subscribing to the same queries.
 */
export function useGuildCapabilities(guildId: string) {
  const ownership = useGuildOwnership(guildId)
  const permissions = useGuildPermissions(guildId)

  return {
    can: (capability: GuildCapability) => capabilityFromState(permissions, capability),
    ownership,
    permissions,
  }
}
