import type { PublicUserProfile } from '@/api/user'

export type RelationshipType = 'outgoing' | 'incoming' | 'friend' | 'blocked'

export interface RelationshipSummary {
  createdAt: number
  profile: PublicUserProfile
  targetId: string
  type: RelationshipType
  updatedAt: number
}

export interface RelationshipPage {
  nextCursor?: string
  relationships: RelationshipSummary[]
}
