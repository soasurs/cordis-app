import { describe, expect, it } from 'vitest'

import { guildMembersInfiniteQueryOptions } from './guild-queries'

describe('guildMembersInfiniteQueryOptions', () => {
  it('continues from an opaque next cursor and stops when it is absent', () => {
    const options = guildMembersInfiniteQueryOptions('42')

    expect(options.initialPageParam).toBeUndefined()
    expect(
      options.getNextPageParam(
        { members: [], nextCursor: 'opaque-next' },
        [],
        undefined,
        [],
      ),
    ).toBe('opaque-next')
    expect(options.getNextPageParam({ members: [] }, [], undefined, [])).toBeUndefined()
  })
})
