import { z } from 'zod'

export const createGuildSchema = z.object({
  name: z.string().trim().min(1, 'Enter a community name'),
})

export type CreateGuildFormValues = z.infer<typeof createGuildSchema>

export const updateGuildSchema = z.object({
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
