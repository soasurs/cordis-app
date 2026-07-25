import { describe, expect, it } from 'vitest'

import type { GuildChannelSummary } from '@/features/guilds/guild-queries'

import {
  getChangedChannelPositions,
  moveGuildChannelInList,
} from '@/features/guilds/channel-ordering'

const channels: GuildChannelSummary[] = [
  channel('1', 1, 0),
  channel('2', 2, 1),
  channel('3', 3, 2),
  channel('4', 1, 3, '2'),
  channel('5', 1, 4, '2'),
]

describe('channel ordering', () => {
  it('reorders channels within their current level', () => {
    const next = moveGuildChannelInList(channels, '1', {
      overChannelId: '3',
      placement: 'after',
    })

    expect(orderedIds(next)).toEqual(['2', '3', '1'])
    expect(next.find((item) => item.id === '1')?.position).toBe(2)
  })

  it('moves a top-level channel into a category using globally unique positions', () => {
    const next = moveGuildChannelInList(channels, '3', {
      overChannelId: '5',
      parentId: '2',
      placement: 'before',
    })

    expect(orderedIds(next)).toEqual(['1', '2'])
    expect(orderedIds(next, '2')).toEqual(['4', '3', '5'])
    expect(next.find((item) => item.id === '3')).toMatchObject({ parentId: '2', position: 3 })
    expect(globalPositions(next)).toEqual([0, 1, 2, 3, 4])
  })

  it('moves a category child back to the top level', () => {
    const next = moveGuildChannelInList(channels, '4', { placement: 'end' })

    expect(orderedIds(next)).toEqual(['1', '2', '3', '4'])
    expect(orderedIds(next, '2')).toEqual(['5'])
    expect(next.find((item) => item.id === '4')?.parentId).toBeUndefined()
    expect(getChangedChannelPositions(channels, next)).toEqual([
      { channelId: '4', parentId: null, position: 3 },
    ])
  })

  it('does not allow categories to be nested', () => {
    expect(moveGuildChannelInList(channels, '2', { parentId: '2', placement: 'end' })).toBe(
      channels,
    )
  })

  it('returns only globally changed positions affected by a move', () => {
    const next = moveGuildChannelInList(channels, '3', {
      parentId: '2',
      placement: 'end',
    })

    expect(getChangedChannelPositions(channels, next)).toEqual([
      { channelId: '3', parentId: '2', position: 4 },
      { channelId: '4', position: 2 },
      { channelId: '5', position: 3 },
    ])
  })

  it('only changes the parent when moving a channel into an empty category', () => {
    const withEmptyCategory = channels.filter((item) => item.parentId !== '2')
    const next = moveGuildChannelInList(withEmptyCategory, '3', {
      parentId: '2',
      placement: 'end',
    })

    expect(next.find((item) => item.id === '3')).toMatchObject({ parentId: '2', position: 2 })
    expect(getChangedChannelPositions(withEmptyCategory, next)).toEqual([
      { channelId: '3', parentId: '2', position: 2 },
    ])
  })
})

function channel(
  id: string,
  type: number,
  position: number,
  parentId?: string,
): GuildChannelSummary {
  return {
    guildId: '42',
    id,
    name: `channel-${id}`,
    parentId,
    position,
    revision: 1,
    topic: '',
    type,
  }
}

function orderedIds(items: GuildChannelSummary[], parentId?: string) {
  return items
    .filter((item) => item.parentId === parentId)
    .sort((left, right) => left.position - right.position)
    .map((item) => item.id)
}

function globalPositions(items: GuildChannelSummary[]) {
  return items.map((item) => item.position).sort((left, right) => left - right)
}
