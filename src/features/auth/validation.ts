import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address')
  .email('Enter a valid email address')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Confirm your password'),
    email: emailSchema,
    inviteCode: z.string().trim(),
    name: z.string().trim().min(1, 'Enter your display name'),
    password: z.string().min(8, 'Password must contain at least 8 characters'),
    username: z
      .string()
      .trim()
      .min(1, 'Choose a username')
      .regex(/^[a-z0-9_]+$/, 'Use only lowercase letters, numbers, and underscores'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Confirm your new password'),
    newPassword: z.string().min(8, 'Password must contain at least 8 characters'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function getFieldError(errors: readonly unknown[]): string | undefined {
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
