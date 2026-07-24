import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearAuthenticationTokens,
  getAccessToken,
  getRefreshToken,
  restoreAccessToken,
  storeAuthenticationTokens,
  subscribeToAuthenticationCleared,
} from './session'

const localStorageValues = new Map<string, string>()
const sessionStorageValues = new Map<string, string>()

beforeEach(() => {
  localStorageValues.clear()
  sessionStorageValues.clear()
  defineStorage('localStorage', localStorageValues)
  defineStorage('sessionStorage', sessionStorageValues)
})

function defineStorage(name: 'localStorage' | 'sessionStorage', values: Map<string, string>) {
  Object.defineProperty(window, name, {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      get length() {
        return values.size
      },
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
}

afterEach(() => clearAuthenticationTokens())

describe('authentication token storage', () => {
  it('persists the access token per tab and the refresh token across tabs', () => {
    storeAuthenticationTokens({
      accessToken: 'access-token',
      accessTokenExpiresAt: BigInt(Date.now() + 60_000),
      refreshToken: 'refresh-token',
    })

    expect(getAccessToken()).toBe('access-token')
    expect(getRefreshToken()).toBe('refresh-token')
    expect(window.localStorage).toHaveLength(1)
    expect(window.sessionStorage).toHaveLength(2)
  })

  it('clears both tokens', () => {
    storeAuthenticationTokens({
      accessToken: 'access-token',
      accessTokenExpiresAt: BigInt(Date.now() + 60_000),
      refreshToken: 'refresh-token',
    })

    clearAuthenticationTokens()

    expect(getAccessToken()).toBeUndefined()
    expect(getRefreshToken()).toBeNull()
    expect(window.sessionStorage).toHaveLength(0)
  })

  it('restores an access token that is not close to expiring', () => {
    window.sessionStorage.setItem('cordis.accessToken', 'stored-access-token')
    window.sessionStorage.setItem('cordis.accessTokenExpiresAt', String(Date.now() + 60_000))

    expect(restoreAccessToken()).toBe(true)
    expect(getAccessToken()).toBe('stored-access-token')
  })

  it('discards an expired access token', () => {
    window.sessionStorage.setItem('cordis.accessToken', 'expired-access-token')
    window.sessionStorage.setItem('cordis.accessTokenExpiresAt', String(Date.now() - 1))

    expect(restoreAccessToken()).toBe(false)
    expect(getAccessToken()).toBeUndefined()
    expect(window.sessionStorage).toHaveLength(0)
  })

  it('notifies subscribers when authentication is cleared', () => {
    let notifications = 0
    const unsubscribe = subscribeToAuthenticationCleared(() => {
      notifications += 1
    })

    clearAuthenticationTokens()
    unsubscribe()
    clearAuthenticationTokens()

    expect(notifications).toBe(1)
  })
})
