import type { PropsWithChildren } from 'react'

import type { GatewayStatus } from '@/app/gateway-context'

export interface AppUserSummary {
  name: string
  username: string
}

export interface AppGuildSummary {
  iconAssetId: string
  id: string
  name: string
}

export interface AppShellProps extends PropsWithChildren {
  activeGuildId?: string
  gatewayStatus?: GatewayStatus
  guilds?: AppGuildSummary[]
  onCreateCommunity?: () => void
  onSelectGuild?: (guildId: string) => void
  onSelectHome?: () => void
  user: AppUserSummary
}

export function getInitials(name: string, username: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length > 0) {
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  // Fall back to username when display name is empty; 'C' is Cordis branding.
  return username.slice(0, 2).toUpperCase() || 'C'
}
