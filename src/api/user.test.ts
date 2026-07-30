import { beforeEach, describe, expect, it, vi } from 'vitest'

const userClient = vi.hoisted(() => ({
  abortAvatarUpload: vi.fn(),
  changePassword: vi.fn(),
  checkUsernameAvailability: vi.fn(),
  createAvatarUpload: vi.fn(),
  getAvatarUploadConstraints: vi.fn(),
  getUserProfile: vi.fn(),
  updateEmail: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUsername: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => userClient,
}))
vi.mock('./client', () => ({ apiTransport: {} }))

import {
  abortAvatarUpload,
  changePassword,
  checkUsernameAvailability,
  createAvatarUpload,
  getAvatarUploadConstraints,
  getUserProfile,
  updateEmail,
  updateUserProfile,
  updateUsername,
} from '@/api/user'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('user API', () => {
  it('maps a public profile into the application representation', async () => {
    userClient.getUserProfile.mockResolvedValue({
      profile: {
        avatarAssetId: 9n,
        bio: 'Building thoughtful tools.',
        createdAt: 1_000n,
        name: 'Alex Chen',
        updatedAt: 2_000n,
        userId: 7n,
        username: 'alex_chen',
      },
    })

    await expect(getUserProfile('7')).resolves.toEqual({
      avatarAssetId: '9',
      bio: 'Building thoughtful tools.',
      createdAt: 1_000,
      name: 'Alex Chen',
      updatedAt: 2_000,
      userId: '7',
      username: 'alex_chen',
    })
    expect(userClient.getUserProfile).toHaveBeenCalledWith({ userId: 7n })
  })

  it('rejects an invalid user identifier before calling the API', async () => {
    await expect(getUserProfile('not-an-id')).rejects.toThrow('user id is invalid')
    expect(userClient.getUserProfile).not.toHaveBeenCalled()
  })

  it('maps avatar constraints and upload contracts', async () => {
    userClient.getAvatarUploadConstraints.mockResolvedValue({
      constraints: {
        allowedContentTypes: ['image/png', 'image/webp'],
        maxFileSizeBytes: 5_000_000n,
        maxHeight: 2048,
        maxPixels: 4_000_000n,
        maxWidth: 2048,
      },
    })
    userClient.createAvatarUpload.mockResolvedValue({
      expiresAt: 8_000n,
      presignedUrl: 'https://upload.example/avatar',
      requestHeaders: { 'content-type': 'image/png' },
      uploadId: 19n,
    })

    await expect(getAvatarUploadConstraints()).resolves.toEqual({
      allowedContentTypes: ['image/png', 'image/webp'],
      maxFileSizeBytes: 5_000_000,
      maxHeight: 2048,
      maxPixels: 4_000_000,
      maxWidth: 2048,
    })
    await expect(createAvatarUpload({ size: 256, type: 'image/png' })).resolves.toEqual({
      expiresAt: 8_000,
      presignedUrl: 'https://upload.example/avatar',
      requestHeaders: { 'content-type': 'image/png' },
      uploadId: '19',
    })
  })

  it('updates only explicitly provided profile fields', async () => {
    const profile = {
      avatarAssetId: 0n,
      bio: '',
      createdAt: 1_000n,
      name: 'Alex',
      updatedAt: 2_000n,
      userId: 7n,
      username: 'alex',
    }
    userClient.updateUserProfile.mockResolvedValue({ profile })

    await expect(updateUserProfile({ avatarAssetId: '0', bio: '' })).resolves.toBe(profile)
    expect(userClient.updateUserProfile).toHaveBeenCalledWith({
      avatarAssetId: 0n,
      bio: '',
    })
  })

  it('rejects empty updates and invalid avatar upload identifiers', async () => {
    await expect(updateUserProfile({})).rejects.toThrow(
      'at least one user profile field is required',
    )
    await expect(abortAvatarUpload('invalid')).rejects.toThrow('upload id is invalid')
    expect(userClient.updateUserProfile).not.toHaveBeenCalled()
    expect(userClient.abortAvatarUpload).not.toHaveBeenCalled()
  })

  it('updates account identifiers and checks username availability', async () => {
    const updatedProfile = { username: 'alex_rivera' }
    const updatedUser = { email: 'alex.rivera@example.com' }
    userClient.checkUsernameAvailability.mockResolvedValue({ available: true })
    userClient.updateUsername.mockResolvedValue({ profile: updatedProfile })
    userClient.updateEmail.mockResolvedValue({ user: updatedUser })

    await expect(checkUsernameAvailability('alex_rivera')).resolves.toBe(true)
    await expect(updateUsername('alex_rivera')).resolves.toBe(updatedProfile)
    await expect(updateEmail('alex.rivera@example.com')).resolves.toBe(updatedUser)
    expect(userClient.checkUsernameAvailability).toHaveBeenCalledWith({
      username: 'alex_rivera',
    })
    expect(userClient.updateUsername).toHaveBeenCalledWith({ username: 'alex_rivera' })
    expect(userClient.updateEmail).toHaveBeenCalledWith({ email: 'alex.rivera@example.com' })
  })

  it('changes the password only when the backend accepts it', async () => {
    userClient.changePassword
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })

    await expect(changePassword('old-password', 'new-password')).resolves.toBeUndefined()
    await expect(changePassword('old-password', 'new-password')).rejects.toThrow(
      'password change was not accepted',
    )
    expect(userClient.changePassword).toHaveBeenCalledWith({
      newPassword: 'new-password',
      oldPassword: 'old-password',
    })
  })
})
