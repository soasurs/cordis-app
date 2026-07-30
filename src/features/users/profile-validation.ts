import { z } from 'zod'

export const USER_BIO_MAX_CODE_POINTS = 190

export const updateUserProfileSchema = z.object({
  bio: z
    .string()
    .trim()
    .refine(
      (value) => Array.from(value).length <= USER_BIO_MAX_CODE_POINTS,
      `About me must be ${USER_BIO_MAX_CODE_POINTS} characters or fewer`,
    ),
  name: z.string().trim().min(1, 'Enter a display name'),
})

export type UpdateUserProfileFormValues = z.infer<typeof updateUserProfileSchema>

export function getUserProfileFieldError(errors: readonly unknown[]) {
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
