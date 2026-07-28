const authenticationExpiredListeners = new Set<() => void>()
let authenticationGeneration = 0

export function getAuthenticationGeneration() {
  return authenticationGeneration
}

export function markAuthenticationEstablished() {
  authenticationGeneration += 1
}

export function notifyAuthenticationExpired(requestGeneration: number) {
  if (requestGeneration !== authenticationGeneration) {
    return
  }

  authenticationGeneration += 1
  for (const listener of authenticationExpiredListeners) {
    listener()
  }
}

export function subscribeToAuthenticationExpired(listener: () => void) {
  authenticationExpiredListeners.add(listener)
  return () => {
    authenticationExpiredListeners.delete(listener)
  }
}

export function clearLegacyAuthenticationTokens() {
  try {
    window.localStorage.removeItem('cordis.refreshToken')
  } catch {
    // Continue clearing per-tab credentials when persistent storage is unavailable.
  }

  try {
    window.sessionStorage.removeItem('cordis.accessToken')
    window.sessionStorage.removeItem('cordis.accessTokenExpiresAt')
  } catch {
    // Legacy credentials remain inaccessible when browser storage is unavailable.
  }
}
