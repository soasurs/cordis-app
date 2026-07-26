import { describe, expect, it } from 'vitest'

import { sortGuildChannelOverwrites } from '@/features/guilds/channel-overwrite-ordering'
import type { GuildChannelOverwriteSummary } from '@/features/guilds/guild-queries'

function overwrite(
  partial: Partial<GuildChannelOverwriteSummary> &
    Pick<GuildChannelOverwriteSummary, 'appliesTo' | 'appliesToId'>,
): GuildChannelOverwriteSummary {
  return {
    allow: '0',
    channelId: '43',
    createdAt: 1,
    deny: '0',
    guildId: '42',
    revision: 1,
    updatedAt: 1,
    ...partial,
  }
}

describe('sortGuildChannelOverwrites', () => {
  it('orders role overwrites by position descending with @everyone last', () => {
    const roles = [
      { id: '42', isDefault: true, position: 0 },
      { id: '50', isDefault: false, position: 1 },
      { id: '51', isDefault: false, position: 2 },
    ]
    const sorted = sortGuildChannelOverwrites(
      [
        overwrite({ appliesTo: 'role', appliesToId: '42' }),
        overwrite({ appliesTo: 'member', appliesToId: '7' }),
        overwrite({ appliesTo: 'role', appliesToId: '50' }),
        overwrite({ appliesTo: 'role', appliesToId: '51' }),
      ],
      roles,
    )

    expect(sorted.map((item) => item.appliesToId)).toEqual(['51', '50', '7', '42'])
  })
})
