import { createClient } from '@connectrpc/connect'

import { UserService, type User, type UserProfile } from '@/gen/api/v1/user_pb'

import { apiTransport } from './client'

const userClient = createClient(UserService, apiTransport)

export interface CurrentUser {
  profile: UserProfile
  user: User
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
