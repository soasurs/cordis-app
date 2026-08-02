import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import type { GuildMemberPage } from '@/api/guild'
import { guildRoleMembersQueryKey } from '@/features/guilds/guild-query-options'
import type { GuildMemberSummary } from '@/features/guilds/guild-query-types'

/** Prepend newly assigned members into the role-members infinite cache. */
export function addGuildRoleMembersFromApi(
  queryClient: QueryClient,
  guildId: string,
  roleId: string,
  members: GuildMemberSummary[],
) {
  if (members.length === 0) return

  queryClient.setQueryData<InfiniteData<GuildMemberPage>>(
    guildRoleMembersQueryKey(guildId, roleId),
    (current) => {
      if (!current) {
        return {
          pageParams: [undefined],
          pages: [{ members, nextCursor: undefined }],
        }
      }

      const existingIds = new Set(
        current.pages.flatMap((page) => page.members.map((member) => member.userId)),
      )
      const toAdd = members.filter((member) => !existingIds.has(member.userId))
      if (toAdd.length === 0) return current

      const [firstPage, ...restPages] = current.pages
      return {
        ...current,
        pages: [
          {
            members: [...toAdd, ...(firstPage?.members ?? [])],
            nextCursor: firstPage?.nextCursor,
          },
          ...restPages,
        ],
      }
    },
  )
}

/** Drop members from the role-members infinite cache after a successful remove. */
export function removeGuildRoleMembersFromApi(
  queryClient: QueryClient,
  guildId: string,
  roleId: string,
  userIds: readonly string[],
) {
  if (userIds.length === 0) return
  const removeIds = new Set(userIds)

  queryClient.setQueryData<InfiniteData<GuildMemberPage>>(
    guildRoleMembersQueryKey(guildId, roleId),
    (current) => {
      if (!current) return current
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          members: page.members.filter((member) => !removeIds.has(member.userId)),
        })),
      }
    },
  )
}
