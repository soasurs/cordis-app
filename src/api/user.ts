import { createClient } from '@connectrpc/connect'

import { toUploadStatus, type PresignedUploadContract } from '@/api/assets'
import { UserService, type User, type UserProfile } from '@/gen/api/v1/user_pb'

import { apiTransport } from '@/api/client'
import { optionalIdempotencyKey } from '@/api/idempotency'

const userClient = createClient(UserService, apiTransport)

export interface CurrentUser {
  profile: UserProfile
  user: User
}

export interface PublicUserProfile {
  avatarAssetId: string
  bio: string
  createdAt: number
  name: string
  updatedAt: number
  userId: string
  username: string
}

export interface UpdateUserProfileDetails {
  /** Omit when unchanged. "0" clears the avatar. */
  avatarAssetId?: string
  /** Omit when unchanged. Empty string clears the bio. */
  bio?: string
  /** Omit when unchanged. */
  name?: string
}

export interface AvatarUploadConstraints {
  allowedContentTypes: string[]
  maxFileSizeBytes: number
  maxHeight: number
  maxPixels: number
  maxWidth: number
}

export interface CreateAvatarUploadOptions {
  idempotencyKey?: string
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

  return toPublicUserProfile(response.profile)
}

export async function getAvatarUploadConstraints(): Promise<AvatarUploadConstraints> {
  const response = await userClient.getAvatarUploadConstraints({})

  if (!response.constraints) {
    throw new Error('avatar upload constraints response was incomplete')
  }

  return {
    allowedContentTypes: [...response.constraints.allowedContentTypes],
    maxFileSizeBytes: Number(response.constraints.maxFileSizeBytes),
    maxHeight: response.constraints.maxHeight,
    maxPixels: Number(response.constraints.maxPixels),
    maxWidth: response.constraints.maxWidth,
  }
}

export async function checkUsernameAvailability(
  username: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await userClient.checkUsernameAvailability({ username }, { signal })
  return response.available
}

export async function checkEmailAvailability(
  email: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await userClient.checkEmailAvailability({ email }, { signal })
  return response.available
}

export async function updateUsername(username: string): Promise<UserProfile> {
  const response = await userClient.updateUsername({ username })

  if (!response.profile) {
    throw new Error('update username response was incomplete')
  }

  return response.profile
}

export async function updateEmail(email: string): Promise<User> {
  const response = await userClient.updateEmail({ email })

  if (!response.user) {
    throw new Error('update email response was incomplete')
  }

  return response.user
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const response = await userClient.changePassword({ newPassword, oldPassword })

  if (!response.ok) {
    throw new Error('password change was not accepted')
  }
}

export async function createAvatarUpload(
  file: Pick<File, 'size' | 'type'>,
  options: CreateAvatarUploadOptions = {},
): Promise<PresignedUploadContract> {
  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw new Error('expected upload size is invalid')
  }

  const response = await userClient.createAvatarUpload({
    contentType: file.type,
    expectedSize: BigInt(file.size),
    ...optionalIdempotencyKey(options.idempotencyKey),
  })

  return {
    expiresAt: Number(response.expiresAt),
    idempotentReplay: response.idempotentReplay,
    presignedUrl: response.presignedUrl,
    requestHeaders: { ...response.requestHeaders },
    status: toUploadStatus(response.status),
    uploadId: response.uploadId.toString(),
  }
}

export async function abortAvatarUpload(uploadId: string): Promise<void> {
  assertIdentifier(uploadId, 'upload')
  await userClient.abortAvatarUpload({ uploadId: BigInt(uploadId) })
}

export async function updateUserProfile(details: UpdateUserProfileDetails): Promise<UserProfile> {
  if (
    details.avatarAssetId === undefined &&
    details.bio === undefined &&
    details.name === undefined
  ) {
    throw new Error('at least one user profile field is required')
  }
  if (details.avatarAssetId !== undefined) {
    assertIdentifier(details.avatarAssetId, 'avatar asset', true)
  }

  const response = await userClient.updateUserProfile({
    ...(details.avatarAssetId !== undefined
      ? { avatarAssetId: BigInt(details.avatarAssetId) }
      : {}),
    ...(details.bio !== undefined ? { bio: details.bio } : {}),
    ...(details.name !== undefined ? { name: details.name } : {}),
  })

  if (!response.profile) {
    throw new Error('update user profile response was incomplete')
  }

  return response.profile
}

export function toPublicUserProfile(profile: UserProfile): PublicUserProfile {
  return {
    avatarAssetId: profile.avatarAssetId.toString(),
    bio: profile.bio,
    createdAt: Number(profile.createdAt),
    name: profile.name,
    updatedAt: Number(profile.updatedAt),
    userId: profile.userId.toString(),
    username: profile.username,
  }
}

function assertIdentifier(value: string, label: string, allowZero = false) {
  if (!/^\d+$/.test(value) || (!allowZero && value === '0')) {
    throw new Error(`${label} id is invalid`)
  }
}
