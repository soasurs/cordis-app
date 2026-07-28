import { createClient } from '@connectrpc/connect'

import { AuthenticatorService, TokenTransport } from '@/gen/api/v1/authenticator_pb'

import { markAuthenticationEstablished } from '@/api/authentication'
import { apiTransport } from '@/api/client'
import { publicApiTransport } from '@/api/transport'

const authenticatorClient = createClient(AuthenticatorService, publicApiTransport)
const authenticatedAuthenticatorClient = createClient(AuthenticatorService, apiTransport)

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
  const response = await authenticatorClient.login({
    ...credentials,
    tokenTransport: TokenTransport.COOKIE,
  })

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

  markAuthenticationEstablished()
  return { kind: 'authenticated' }
}

export async function createGatewayTicket() {
  const response = await authenticatedAuthenticatorClient.createGatewayTicket({})

  if (!response.gatewayTicket) {
    throw new Error('gateway ticket response was incomplete')
  }

  return response.gatewayTicket
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
