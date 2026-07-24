import { createClient } from '@connectrpc/connect'

import { AuthenticatorService } from '@/gen/api/v1/authenticator_pb'

import { clearAuthenticationTokens, storeAuthenticationTokens } from './session'
import { publicApiTransport } from './transport'

const authenticatorClient = createClient(AuthenticatorService, publicApiTransport)

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegistrationDetails extends LoginCredentials {
  inviteCode: string
  name: string
  username: string
}

export type LoginOutcome =
  | { kind: 'authenticated' }
  | { challengeToken: string; expiresAt: bigint; kind: 'twoFactorRequired' }

export async function login(credentials: LoginCredentials): Promise<LoginOutcome> {
  const response = await authenticatorClient.login(credentials)

  if (response.outcome.case === 'twoFactorChallenge') {
    return {
      challengeToken: response.outcome.value.token,
      expiresAt: response.outcome.value.expiresAt,
      kind: 'twoFactorRequired',
    }
  }

  if (response.outcome.case !== 'result' || !response.outcome.value.ok) {
    throw new Error('login response did not contain an authenticated session')
  }

  storeAuthenticationTokens(response.outcome.value)
  return { kind: 'authenticated' }
}

export async function registerAccount(details: RegistrationDetails) {
  const response = await authenticatorClient.register({
    email: details.email,
    name: details.name,
    password: details.password,
    registrationInviteCode: details.inviteCode,
    username: details.username,
  })

  if (!response.ok) {
    throw new Error('registration was not accepted')
  }
}

export async function requestPasswordReset(email: string) {
  const response = await authenticatorClient.requestPasswordReset({ email })

  if (!response.ok) {
    throw new Error('password reset request was not accepted')
  }
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const response = await authenticatorClient.confirmPasswordReset({ newPassword, token })

  if (!response.ok) {
    throw new Error('password reset was not accepted')
  }

  clearAuthenticationTokens()
}

export async function requestEmailVerification(email: string) {
  const response = await authenticatorClient.requestEmailVerification({ email })

  if (!response.ok) {
    throw new Error('email verification request was not accepted')
  }
}

export async function confirmEmailVerification(token: string) {
  const response = await authenticatorClient.confirmEmailVerification({ token })

  if (!response.ok) {
    throw new Error('email verification was not accepted')
  }

  return true
}
