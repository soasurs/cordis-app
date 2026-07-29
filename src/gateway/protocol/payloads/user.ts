export interface UserProfilePayload {
  user_id: string
  name: string
  avatar_asset_id: string
  bio: string
  created_at: number
  updated_at: number
  username: string
}

export type MessageAuthorPayload = UserProfilePayload
