import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import type { GuildRole, GuildRoleDetails, GuildRolePosition } from '@/api/guild/types'

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
  if (!details.name) {
    throw new Error('role name is required')
  }
  if (details.permissions === undefined) {
    throw new Error('role permissions are required')
  }
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

  const name = details.name
  const permissions =
    details.permissions === undefined ? undefined : parsePermissions(details.permissions)
  if (name === undefined && permissions === undefined) {
    throw new Error('at least one role field is required')
  }

  const response = await guildClient.updateGuildRole({
    guildId: BigInt(guildId),
    roleId: BigInt(roleId),
    ...(name !== undefined ? { name } : {}),
    ...(permissions !== undefined ? { permissions } : {}),
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

/** Accepts a decimal string and rejects values outside the uint64 range. */
function parsePermissions(value: string) {
  try {
    const permissions = BigInt(value)
    if (permissions < 0n || permissions > (1n << 64n) - 1n) {
      throw new Error('role permissions are invalid')
    }
    return permissions
  } catch {
    // BigInt throws on non-numeric input; normalize every failure to the same error.
    throw new Error('role permissions are invalid')
  }
}
