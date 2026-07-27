import { describe, expect, it } from 'vitest'

import {
  channelOverwriteAffectsVisibleChannels,
  channelOverwriteRemovalAffectsVisibleChannels,
  rolePermissionsAffectVisibleChannels,
} from '@/features/guilds/channel-visibility'

describe('channel visibility permission helpers', () => {
  it('detects View Channel and Administrator changes on roles', () => {
    expect(rolePermissionsAffectVisibleChannels('64', '96')).toBe(true)
    expect(rolePermissionsAffectVisibleChannels('32', '33')).toBe(true)
    expect(rolePermissionsAffectVisibleChannels('64', '192')).toBe(false)
  })

  it('detects View Channel overwrite allow/deny changes only', () => {
    expect(
      channelOverwriteAffectsVisibleChannels({ allow: '0', deny: '0' }, { allow: '32', deny: '0' }),
    ).toBe(true)
    expect(
      channelOverwriteAffectsVisibleChannels(
        { allow: '32', deny: '0' },
        { allow: '96', deny: '0' },
      ),
    ).toBe(false)
    // Administrator is not a channel overwrite bit; ignore it for listing refresh.
    expect(
      channelOverwriteAffectsVisibleChannels({ allow: '0', deny: '0' }, { allow: '1', deny: '0' }),
    ).toBe(false)
    expect(channelOverwriteAffectsVisibleChannels(undefined, { allow: '64', deny: '0' })).toBe(
      false,
    )
    expect(channelOverwriteAffectsVisibleChannels(undefined, { allow: '32', deny: '0' })).toBe(true)
    expect(channelOverwriteRemovalAffectsVisibleChannels({ allow: '0', deny: '32' })).toBe(true)
    expect(channelOverwriteRemovalAffectsVisibleChannels({ allow: '64', deny: '0' })).toBe(false)
  })
})
