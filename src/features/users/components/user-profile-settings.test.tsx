import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryKey } from '@/features/auth/auth-session'
import { UserProfileSettings } from '@/features/users/components/user-profile-settings'
import { userProfileQueryKey } from '@/features/users/user-queries'

const assetsApi = vi.hoisted(() => ({
  putToPresignedUrl: vi.fn(),
  resolveAvatarUrl: vi.fn(),
}))
const userApi = vi.hoisted(() => ({
  abortAvatarUpload: vi.fn(),
  createAvatarUpload: vi.fn(),
  getAvatarUploadConstraints: vi.fn(),
  getCurrentUser: vi.fn(),
  toPublicUserProfile: vi.fn((profile) => ({
    avatarAssetId: profile.avatarAssetId.toString(),
    bio: profile.bio,
    createdAt: Number(profile.createdAt),
    name: profile.name,
    updatedAt: Number(profile.updatedAt),
    userId: profile.userId.toString(),
    username: profile.username,
  })),
  updateUserProfile: vi.fn(),
}))

vi.mock('@/api/assets', async (importOriginal) => ({
  ...(await importOriginal()),
  ...assetsApi,
}))
vi.mock('@/api/user', () => userApi)
vi.mock('@/features/guilds/components/guild-icon-crop-dialog', () => ({
  GuildIconCropDialog: ({ file, onConfirm }: { file: File; onConfirm: (file: File) => void }) => (
    <button type="button" onClick={() => onConfirm(file)}>
      Use cropped image
    </button>
  ),
}))

const profile = {
  avatarAssetId: 0n,
  bio: 'Building thoughtful tools.',
  createdAt: 1_000n,
  name: 'Alex Chen',
  updatedAt: 2_000n,
  userId: 7n,
  username: 'alex_chen',
}
const session = {
  profile,
  user: {
    createdAt: 1_000n,
    email: 'alex@example.com',
    emailVerifiedAt: 1_500n,
    updatedAt: 2_000n,
    userId: 7n,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:avatar-preview'),
    revokeObjectURL: vi.fn(),
  })
  userApi.getAvatarUploadConstraints.mockResolvedValue({
    allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSizeBytes: 5_000_000,
    maxHeight: 2048,
    maxPixels: 4_000_000,
    maxWidth: 2048,
  })
})

describe('UserProfileSettings', () => {
  it('updates profile fields and refreshes the current-user caches', async () => {
    const updatedProfile = {
      ...profile,
      bio: 'A calmer profile.',
      name: 'Alex Rivera',
      updatedAt: 3_000n,
    }
    userApi.updateUserProfile.mockResolvedValue(updatedProfile)
    const { queryClient } = renderSettings()
    const user = userEvent.setup()

    await user.clear(screen.getByRole('textbox', { name: /^Display name/ }))
    await user.type(screen.getByRole('textbox', { name: /^Display name/ }), 'Alex Rivera')
    await user.clear(screen.getByRole('textbox', { name: /^About me/ }))
    await user.type(screen.getByRole('textbox', { name: /^About me/ }), 'A calmer profile.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Profile saved.')
    expect(userApi.updateUserProfile).toHaveBeenCalledWith({
      bio: 'A calmer profile.',
      name: 'Alex Rivera',
    })
    expect(queryClient.getQueryData(authSessionQueryKey)).toEqual({
      ...session,
      profile: updatedProfile,
    })
    expect(queryClient.getQueryData(userProfileQueryKey('7'))).toMatchObject({
      bio: 'A calmer profile.',
      name: 'Alex Rivera',
    })
  })

  it('uploads the cropped avatar and aborts the unpublished upload when saving fails', async () => {
    userApi.createAvatarUpload.mockResolvedValue({
      expiresAt: 8_000,
      idempotentReplay: false,
      presignedUrl: 'https://upload.example/avatar',
      requestHeaders: { 'content-type': 'image/png' },
      status: 'created',
      uploadId: '19',
    })
    userApi.updateUserProfile.mockRejectedValue(new Error('update failed'))
    renderSettings()
    const user = userEvent.setup()
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    const fileInput = screen.getByLabelText('Upload profile photo')
    await waitFor(() => expect(fileInput).toBeEnabled())
    await user.upload(fileInput, file)
    await user.click(screen.getByRole('button', { name: 'Use cropped image' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to update your profile.')
    expect(userApi.createAvatarUpload).toHaveBeenCalledWith(file, {
      idempotencyKey: expect.any(String),
    })
    expect(assetsApi.putToPresignedUrl).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ uploadId: '19' }),
    )
    expect(userApi.updateUserProfile).toHaveBeenCalledWith({ avatarAssetId: '19' })
    await waitFor(() => expect(userApi.abortAvatarUpload).toHaveBeenCalledWith('19'))
  })

  it('completes an already-terminal avatar replay without uploading again', async () => {
    userApi.createAvatarUpload.mockResolvedValue({
      expiresAt: 8_000,
      idempotentReplay: true,
      presignedUrl: '',
      requestHeaders: {},
      status: 'ready',
      uploadId: '19',
    })
    userApi.updateUserProfile.mockResolvedValue({
      ...profile,
      avatarAssetId: 19n,
      updatedAt: 3_000n,
    })
    renderSettings()
    const user = userEvent.setup()
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    await waitFor(() => expect(screen.getByLabelText('Upload profile photo')).toBeEnabled())
    await user.upload(screen.getByLabelText('Upload profile photo'), file)
    await user.click(screen.getByRole('button', { name: 'Use cropped image' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(userApi.updateUserProfile).toHaveBeenCalledWith({ avatarAssetId: '19' }),
    )
    expect(assetsApi.putToPresignedUrl).not.toHaveBeenCalled()
    expect(userApi.abortAvatarUpload).not.toHaveBeenCalled()
  })
})

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(authSessionQueryKey, session)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  render(<UserProfileSettings session={session as never} />, { wrapper })
  return { queryClient }
}
