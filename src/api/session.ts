const refreshTokenStorageKey = 'cordis.refreshToken'
const accessTokenStorageKey = 'cordis.accessToken'
const accessTokenExpiresAtStorageKey = 'cordis.accessTokenExpiresAt'
const accessTokenExpirySkewMs = 30_000

let accessToken: string | undefined
let accessTokenExpiresAt: number | undefined
const authenticationClearedListeners = new Set<() => void>()

export interface AuthenticationTokens {
  accessToken: string
  accessTokenExpiresAt: bigint
  refreshToken: string
}

export function storeAuthenticationTokens(tokens: AuthenticationTokens) {
  accessToken = tokens.accessToken
  accessTokenExpiresAt = Number(tokens.accessTokenExpiresAt)

  try {
    window.sessionStorage.setItem(accessTokenStorageKey, tokens.accessToken)
    window.sessionStorage.setItem(
      accessTokenExpiresAtStorageKey,
      tokens.accessTokenExpiresAt.toString(),
    )
  } catch {
    clearPersistedAccessToken()
  }

  try {
    window.localStorage.setItem(refreshTokenStorageKey, tokens.refreshToken)
  } catch {
    // The in-memory session remains usable when browser storage is unavailable.
  }
}

export function getAccessToken() {
  return accessToken
}

export function getUsableAccessToken() {
  if (
    !accessToken ||
    !accessTokenExpiresAt ||
    accessTokenExpiresAt <= Date.now() + accessTokenExpirySkewMs
  ) {
    accessToken = undefined
    accessTokenExpiresAt = undefined
    clearPersistedAccessToken()
    return undefined
  }

  return accessToken
}

export function restoreAccessToken() {
  try {
    const storedAccessToken = window.sessionStorage.getItem(accessTokenStorageKey)
    const storedExpiresAt = window.sessionStorage.getItem(accessTokenExpiresAtStorageKey)
    const expiresAt = storedExpiresAt ? Number(storedExpiresAt) : Number.NaN

    if (
      !storedAccessToken ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Date.now() + accessTokenExpirySkewMs
    ) {
      accessToken = undefined
      clearPersistedAccessToken()
      return false
    }

    accessToken = storedAccessToken
    accessTokenExpiresAt = expiresAt
    return true
  } catch {
    accessToken = undefined
    accessTokenExpiresAt = undefined
    return false
  }
}

export function getRefreshToken() {
  try {
    return window.localStorage.getItem(refreshTokenStorageKey)
  } catch {
    return null
  }
}

export function clearAuthenticationTokens() {
  accessToken = undefined
  accessTokenExpiresAt = undefined
  clearPersistedAccessToken()

  try {
    window.localStorage.removeItem(refreshTokenStorageKey)
  } catch {
    // There is no persisted token to clear when browser storage is unavailable.
  }

  for (const listener of authenticationClearedListeners) {
    listener()
  }
}

export function subscribeToAuthenticationCleared(listener: () => void) {
  authenticationClearedListeners.add(listener)
  return () => {
    authenticationClearedListeners.delete(listener)
  }
}

function clearPersistedAccessToken() {
  try {
    window.sessionStorage.removeItem(accessTokenStorageKey)
    window.sessionStorage.removeItem(accessTokenExpiresAtStorageKey)
  } catch {
    // There is no persisted token to clear when browser storage is unavailable.
  }
}
