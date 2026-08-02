import type { PublicUserProfile } from '@/api/user'

export interface DmChannelSummary {
  channelId: string
  recipient: PublicUserProfile
  createdAt: number
}

export interface DmChannelPage {
  channels: DmChannelSummary[]
  nextCursor?: string
}
