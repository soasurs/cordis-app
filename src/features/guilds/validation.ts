import { z } from 'zod'

export const createGuildSchema = z.object({
  name: z.string().trim().min(1, 'Enter a community name'),
})

export type CreateGuildFormValues = z.infer<typeof createGuildSchema>

export const updateGuildSchema = z.object({
  description: z.string().trim(),
  name: z.string().trim().min(1, 'Enter a community name'),
})

export type UpdateGuildFormValues = z.infer<typeof updateGuildSchema>

export const guildRoleSchema = z.object({
  name: z.string().trim().min(1, 'Enter a role name'),
  permissions: z.string().regex(/^\d+$/, 'Role permissions are invalid'),
})

export type GuildRoleFormValues = z.infer<typeof guildRoleSchema>

export const createGuildChannelSchema = z.object({
  name: z.string().trim().min(1, 'Enter a channel name'),
  type: z.enum(['category', 'text', 'voice']),
})

export type CreateGuildChannelFormValues = z.infer<typeof createGuildChannelSchema>

export const GUILD_ICON_MAX_BYTES = 10 * 1024 * 1024
export const GUILD_ICON_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const guildIconValidationMessage = {
  contentType: 'Choose a JPEG, PNG, or WebP image.',
  size: 'Choose an image up to 10 MB.',
} as const

export type GuildIconContentType = (typeof GUILD_ICON_CONTENT_TYPES)[number]

export function validateGuildIconFile(file: File): string | undefined {
  if (!GUILD_ICON_CONTENT_TYPES.includes(file.type as GuildIconContentType)) {
    return guildIconValidationMessage.contentType
  }

  if (file.size <= 0 || file.size > GUILD_ICON_MAX_BYTES) {
    return guildIconValidationMessage.size
  }

  return undefined
}

export function getGuildFieldError(errors: readonly unknown[]) {
  for (const error of errors) {
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message
      if (typeof message === 'string') {
        return message
      }
    }
  }
  return undefined
}
