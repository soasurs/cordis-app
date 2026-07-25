import { useMutation, useQueryClient } from '@tanstack/react-query'

import { reorderGuildRoles } from '@/api/guild'

import { type GuildRoleSummary, upsertGuildRolesFromApi } from './guild-queries'

export type GuildRoleMoveDirection = 'down' | 'up'

export function useGuildRoleReordering(guildId: string, roles: GuildRoleSummary[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ direction, roleId }: { direction: GuildRoleMoveDirection; roleId: string }) => {
      const roleIndex = roles.findIndex((role) => role.id === roleId)
      const targetIndex = direction === 'up' ? roleIndex - 1 : roleIndex + 1
      const role = roles[roleIndex]
      const target = roles[targetIndex]

      if (!role || !target) return Promise.resolve([])

      return reorderGuildRoles(guildId, [
        { position: target.position, roleId: role.id },
        { position: role.position, roleId: target.id },
      ])
    },
    onSuccess: (updatedRoles) => {
      upsertGuildRolesFromApi(queryClient, guildId, updatedRoles)
    },
  })
}
