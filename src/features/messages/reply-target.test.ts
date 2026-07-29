import { describe, expect, it } from 'vitest'

import { toMessageContentPreview, toMessageReplyTarget } from '@/features/messages/reply-target'

describe('reply target helpers', () => {
  it('builds a reply target from a message', () => {
    expect(
      toMessageReplyTarget({
        attachments: [],
        author: { name: 'Alex Chen', userId: '7', username: 'alex' },
        channelId: '43',
        content: 'Hello there',
        id: '102',
      }),
    ).toEqual({
      authorName: 'Alex Chen',
      channelId: '43',
      contentPreview: 'Hello there',
      id: '102',
    })
  })

  it('truncates long content and falls back for attachments', () => {
    expect(toMessageContentPreview({ attachments: [], content: 'a'.repeat(130) })).toBe(
      `${'a'.repeat(120)}…`,
    )
    expect(toMessageContentPreview({ attachments: [{}], content: '   ' })).toBe('Attachment')
    expect(toMessageContentPreview({ attachments: [{}, {}], content: '' })).toBe('Attachments')
  })
})
