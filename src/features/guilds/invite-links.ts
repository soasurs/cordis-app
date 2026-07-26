/** App-relative invite path used by the router and shareable links. */
export function buildGuildInvitePath(code: string) {
  const trimmed = code.trim()
  if (!trimmed) {
    throw new Error('invite code is invalid')
  }
  return `/invite/${encodeURIComponent(trimmed)}`
}

/** Absolute invite URL for clipboard sharing. */
export function buildGuildInviteUrl(code: string, origin = window.location.origin) {
  return `${origin}${buildGuildInvitePath(code)}`
}

/** Only allow same-origin relative redirects (blocks protocol-relative and external URLs). */
export function getSafeAppRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) {
    return undefined
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return undefined
  }
  return value
}
