import * as Avatar from '@radix-ui/react-avatar'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { resolveAvatarUrl } from '@/api/assets'
import { getApiErrorMessage } from '@/api/errors'
import { createIdempotencyKey } from '@/api/idempotency'
import {
  getAvatarUploadConstraints,
  toPublicUserProfile,
  updateUserProfile,
  type CurrentUser,
  type UpdateUserProfileDetails,
} from '@/api/user'
import { getInitials } from '@/components/layout/app-shell-types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TextInput } from '@/components/ui/text-input'
import { authSessionQueryKey, setAuthSession } from '@/features/auth/auth-session'
import { GuildIconCropDialog } from '@/features/guilds/components/guild-icon-crop-dialog'
import { ProfilePreview, ProfileStatus } from '@/features/users/components/profile-preview'
import {
  getUserProfileFieldError,
  updateUserProfileSchema,
  USER_BIO_MAX_CODE_POINTS,
  type UpdateUserProfileFormValues,
} from '@/features/users/profile-validation'
import { userProfileQueryKey } from '@/features/users/user-queries'
import {
  getAvatarMutationError,
  uploadUserAvatar,
  validateAvatarFile,
} from '@/features/users/user-profile-avatar-upload'

const avatarConstraintsQueryKey = ['users', 'avatar-upload-constraints'] as const

interface AvatarFileSelection {
  file: File
  previewUrl: string
}

type AvatarSelection = AvatarFileSelection | null | undefined

export function UserProfileSettings({ session }: { session: CurrentUser }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarIntentRef = useRef<{ file: File; key: string; userId: string } | undefined>(undefined)
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection>()
  const [cropFile, setCropFile] = useState<File>()
  const [selectionError, setSelectionError] = useState<string>()
  const profile = session.profile
  const userId = profile.userId.toString()
  const currentAvatarUrl = resolveAvatarUrl(userId, profile.avatarAssetId.toString())
  const constraintsQuery = useQuery({
    queryFn: getAvatarUploadConstraints,
    queryKey: avatarConstraintsQueryKey,
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    const previewUrl = avatarSelection?.previewUrl
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [avatarSelection])

  const updateMutation = useMutation({
    mutationFn: async ({
      avatarFile,
      details,
      idempotencyKey,
    }: {
      avatarFile?: File
      details: UpdateUserProfileDetails
      idempotencyKey?: string
    }) => {
      const clearIntent = () => {
        const currentIntent = avatarIntentRef.current
        if (currentIntent && currentIntent.file === avatarFile && currentIntent.userId === userId) {
          avatarIntentRef.current = undefined
        }
      }
      if (avatarFile) {
        details.avatarAssetId = await uploadUserAvatar({
          constraints: constraintsQuery.data,
          file: avatarFile,
          idempotencyKey,
          onIntentRetired: clearIntent,
        })
      }
      return updateUserProfile(details)
    },
  })

  const form = useForm({
    defaultValues: {
      bio: profile.bio,
      name: profile.name,
    } satisfies UpdateUserProfileFormValues,
    validators: { onSubmit: updateUserProfileSchema },
    onSubmit: async ({ value }) => {
      const parsed = updateUserProfileSchema.parse(value)
      const details: UpdateUserProfileDetails = {}
      if (parsed.name !== profile.name) details.name = parsed.name
      if (parsed.bio !== profile.bio) details.bio = parsed.bio
      if (avatarSelection === null) details.avatarAssetId = '0'
      const avatarFile = avatarSelection?.file
      const avatarIntent = avatarFile
        ? avatarIntentRef.current?.file === avatarFile && avatarIntentRef.current.userId === userId
          ? avatarIntentRef.current
          : { file: avatarFile, key: createIdempotencyKey(), userId }
        : undefined
      avatarIntentRef.current = avatarIntent

      try {
        const updatedProfile = await updateMutation.mutateAsync({
          avatarFile,
          details,
          idempotencyKey: avatarIntent?.key,
        })
        const currentSession = queryClient.getQueryData<CurrentUser | null>(authSessionQueryKey)
        if (currentSession) {
          setAuthSession(queryClient, { ...currentSession, profile: updatedProfile })
        }
        queryClient.setQueryData(
          userProfileQueryKey(updatedProfile.userId.toString()),
          toPublicUserProfile(updatedProfile),
        )
        form.reset({
          bio: updatedProfile.bio,
          name: updatedProfile.name,
        })
        avatarIntentRef.current = undefined
        setAvatarSelection(undefined)
      } catch {
        // Keep the edited values available; the mutation error is rendered below.
      }
    },
  })

  const clearResult = () => {
    if (updateMutation.isError || updateMutation.isSuccess) updateMutation.reset()
    setSelectionError(undefined)
  }
  const selectedAvatarUrl =
    avatarSelection === null ? undefined : (avatarSelection?.previewUrl ?? currentAvatarUrl)
  const initials = getInitials(profile.name, profile.username)
  const error = selectionError
    ? selectionError
    : updateMutation.error
      ? getAvatarMutationError(updateMutation.error)
      : constraintsQuery.error
        ? getApiErrorMessage(
            constraintsQuery.error,
            'Unable to load avatar upload limits. Please try again.',
          )
        : undefined

  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
          Personal identity
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Profile</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Choose how other people see you across Cordis.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-shell border border-line bg-surface-raised p-5 shadow-panel sm:p-6">
          <ProfileStatus error={error} saved={updateMutation.isSuccess} />

          <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
            <Avatar.Root className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[1.75rem] border border-line bg-brand-soft text-xl font-bold text-brand-text">
              {selectedAvatarUrl ? (
                <Avatar.Image alt="" className="size-full object-cover" src={selectedAvatarUrl} />
              ) : null}
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar.Root>
            <div>
              <p className="text-sm font-semibold text-ink">Profile photo</p>
              <p className="mt-1 text-xs leading-5 text-subtle">
                Use a JPEG, PNG, or WebP image. You can crop it before saving.
              </p>
              <input
                ref={fileInputRef}
                accept={constraintsQuery.data?.allowedContentTypes.join(',')}
                aria-label="Upload profile photo"
                className="sr-only"
                disabled={constraintsQuery.isPending || updateMutation.isPending}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  clearResult()
                  const validationError = validateAvatarFile(file, constraintsQuery.data)
                  if (validationError) {
                    setSelectionError(validationError)
                    return
                  }
                  setCropFile(file)
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={constraintsQuery.isPending || updateMutation.isPending}
                  size="small"
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    clearResult()
                    fileInputRef.current?.click()
                  }}
                >
                  Change photo
                </Button>
                {(currentAvatarUrl || avatarSelection?.file) && avatarSelection !== null ? (
                  <Button
                    disabled={updateMutation.isPending}
                    size="small"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      clearResult()
                      setAvatarSelection(null)
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <form
            noValidate
            className="mt-6 grid gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setSelectionError(undefined)
              void form.handleSubmit()
            }}
          >
            <form.Field name="name">
              {(field) => (
                <TextInput
                  required
                  autoComplete="name"
                  disabled={updateMutation.isPending}
                  error={getUserProfileFieldError(field.state.meta.errors)}
                  hint="Shown in messages, member lists, and your public profile."
                  label="Display name"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    clearResult()
                    field.handleChange(event.target.value)
                  }}
                />
              )}
            </form.Field>

            <form.Field name="bio">
              {(field) => (
                <Textarea
                  autoComplete="off"
                  disabled={updateMutation.isPending}
                  error={getUserProfileFieldError(field.state.meta.errors)}
                  hint={`${Array.from(field.state.value).length} / ${USER_BIO_MAX_CODE_POINTS}`}
                  label="About me"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    clearResult()
                    field.handleChange(event.target.value)
                  }}
                />
              )}
            </form.Field>

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <Button
                disabled={updateMutation.isPending}
                type="button"
                variant="ghost"
                onClick={() => {
                  clearResult()
                  setAvatarSelection(undefined)
                  form.reset({ bio: profile.bio, name: profile.name })
                }}
              >
                Reset
              </Button>
              <form.Subscribe selector={(state) => [state.isSubmitting, state.values] as const}>
                {([isSubmitting, values]) => {
                  const dirty =
                    values.name.trim() !== profile.name ||
                    values.bio.trim() !== profile.bio ||
                    avatarSelection !== undefined
                  return (
                    <Button
                      disabled={!dirty}
                      loading={updateMutation.isPending || isSubmitting}
                      type="submit"
                    >
                      Save changes
                    </Button>
                  )
                }}
              </form.Subscribe>
            </div>
          </form>
        </div>

        <form.Subscribe selector={(state) => state.values}>
          {(values) => (
            <ProfilePreview
              avatarUrl={selectedAvatarUrl}
              bio={values.bio}
              createdAt={Number(profile.createdAt)}
              fallbackName={profile.name}
              name={values.name}
              username={profile.username}
            />
          )}
        </form.Subscribe>
      </div>

      {cropFile ? (
        <GuildIconCropDialog
          confirmCopy="This is how your profile photo will appear. Use it, or go back to adjust the crop."
          confirmImageAlt="Cropped profile photo preview"
          confirmLabel="Use image"
          confirmTitle="Confirm profile photo"
          file={cropFile}
          onCancel={() => setCropFile(undefined)}
          onConfirm={(file) => {
            clearResult()
            setAvatarSelection({ file, previewUrl: URL.createObjectURL(file) })
            setCropFile(undefined)
          }}
        />
      ) : null}
    </>
  )
}
