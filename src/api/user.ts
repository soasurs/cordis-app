import { createClient } from '@connectrpc/connect'

import { UserService, type User, type UserProfile } from '@/gen/api/v1/user_pb'

import { apiTransport } from './client'

const userClient = createClient(UserService, apiTransport)

export interface CurrentUser {
  profile: UserProfile
  user: User
}

export interface PublicUserProfile {
  avatarAssetId: string
  createdAt: number
  name: string
  updatedAt: number
  userId: string
  username: string
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await userClient.getCurrentUser({})

  if (!response.user || !response.profile) {
    throw new Error('current user response was incomplete')
  }

  return {
    profile: response.profile,
    user: response.user,
  }
}

export async function getUserProfile(userId: string): Promise<PublicUserProfile> {
  if (!/^\d+$/.test(userId)) {
    throw new Error('user id is invalid')
  }

  const response = await userClient.getUserProfile({ userId: BigInt(userId) })

  if (!response.profile) {
    throw new Error('user profile response was incomplete')
  }

  return {
    avatarAssetId: response.profile.avatarAssetId.toString(),
    createdAt: Number(response.profile.createdAt),
    name: response.profile.name,
    updatedAt: Number(response.profile.updatedAt),
    userId: response.profile.userId.toString(),
    username: response.profile.username,
  }
}
