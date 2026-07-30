import { z } from 'zod'

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Choose a username')
    .regex(/^[a-z0-9_]+$/, 'Use only lowercase letters, numbers, and underscores'),
})

export const updateEmailSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
})

export const changePasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Confirm your new password'),
    newPassword: z.string().min(8, 'Password must contain at least 8 characters'),
    oldPassword: z.string().min(1, 'Enter your current password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type UpdateUsernameFormValues = z.infer<typeof updateUsernameSchema>
export type UpdateEmailFormValues = z.infer<typeof updateEmailSchema>
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
