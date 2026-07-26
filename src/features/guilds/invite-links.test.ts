import { describe, expect, it } from 'vitest'

import {
  buildGuildInvitePath,
  buildGuildInviteUrl,
  getSafeAppRedirect,
} from '@/features/guilds/invite-links'

describe('invite links', () => {
  it('builds encoded invite paths and absolute URLs', () => {
    expect(buildGuildInvitePath('cordis-hello')).toBe('/invite/cordis-hello')
    expect(buildGuildInvitePath('a/b c')).toBe('/invite/a%2Fb%20c')
    expect(buildGuildInviteUrl('cordis-hello', 'https://app.cordis.test')).toBe(
      'https://app.cordis.test/invite/cordis-hello',
    )
  })

  it('rejects invalid invite codes and unsafe redirects', () => {
    expect(() => buildGuildInvitePath('  ')).toThrow('invite code is invalid')
    expect(getSafeAppRedirect('/invite/cordis-hello')).toBe('/invite/cordis-hello')
    expect(getSafeAppRedirect('//evil.example')).toBeUndefined()
    expect(getSafeAppRedirect('https://evil.example')).toBeUndefined()
    expect(getSafeAppRedirect('')).toBeUndefined()
  })
})
