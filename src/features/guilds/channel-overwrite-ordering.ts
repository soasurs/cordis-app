import type { GuildChannelPermissionOverwrite } from '@/api/guild'
import type { GuildRoleSummary } from '@/features/guilds/guild-queries'

/**
 * Channel overwrite list order mirrors the role sidebar: higher role position
 * first, @everyone last. Member overwrites sit above @everyone.
 */
export function sortGuildChannelOverwrites<T extends GuildChannelPermissionOverwrite>(
  overwrites: T[],
  roles: Pick<GuildRoleSummary, 'id' | 'isDefault' | 'position'>[],
): T[] {
  const roleById = new Map(roles.map((role) => [role.id, role]))

  return [...overwrites].sort((left, right) => {
    const leftRank = overwriteSortRank(left, roleById)
    const rightRank = overwriteSortRank(right, roleById)
    if (leftRank.bucket !== rightRank.bucket) return leftRank.bucket - rightRank.bucket
    if (leftRank.position !== rightRank.position) return rightRank.position - leftRank.position
    return left.appliesToId.localeCompare(right.appliesToId)
  })
}

function overwriteSortRank(
  overwrite: GuildChannelPermissionOverwrite,
  roleById: Map<string, Pick<GuildRoleSummary, 'id' | 'isDefault' | 'position'>>,
) {
  if (overwrite.appliesTo === 'member') {
    return { bucket: 1, position: 0 }
  }

  const role = roleById.get(overwrite.appliesToId)
  const isEveryone = role?.isDefault || overwrite.appliesToId === overwrite.guildId
  if (isEveryone) {
    return { bucket: 2, position: 0 }
  }

  return { bucket: 0, position: role?.position ?? -1 }
}
