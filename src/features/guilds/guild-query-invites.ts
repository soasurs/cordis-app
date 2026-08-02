import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import type { GuildInvitePage } from '@/api/guild'
import { guildInvitesQueryKey } from '@/features/guilds/guild-query-options'
import type { GuildInviteSummary } from '@/features/guilds/guild-query-types'

export function prependGuildInviteFromApi(queryClient: QueryClient, invite: GuildInviteSummary) {
  queryClient.setQueryData<InfiniteData<GuildInvitePage>>(
    guildInvitesQueryKey(invite.guildId),
    (current) => {
      if (!current) {
        return {
          pageParams: [undefined],
          pages: [{ invites: [invite] }],
        }
      }

      const [firstPage, ...restPages] = current.pages
      const invites = [
        invite,
        ...(firstPage?.invites ?? []).filter((item) => item.id !== invite.id),
      ]

      return {
        ...current,
        pages: [{ invites, nextCursor: firstPage?.nextCursor }, ...restPages],
      }
    },
  )
}

export function removeGuildInviteFromApi(queryClient: QueryClient, guildId: string, code: string) {
  queryClient.setQueryData<InfiniteData<GuildInvitePage>>(
    guildInvitesQueryKey(guildId),
    (current) => {
      if (!current) return current

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          invites: page.invites.filter((invite) => invite.code !== code),
        })),
      }
    },
  )
}
