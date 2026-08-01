import { describe, expect, it } from 'vitest'

import { formatMessageTime } from '@/features/messages/message-time'

const messageTimeLocale = 'en-US'

const timeFormatterOptions: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
}

const dateTimeFormatterOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'short',
}

const dateTimeWithYearFormatterOptions: Intl.DateTimeFormatOptions = {
  ...dateTimeFormatterOptions,
  year: 'numeric',
}

describe('formatMessageTime', () => {
  const now = new Date(2026, 7, 2, 15, 4)

  it('shows only the time for messages from today', () => {
    const createdAt = new Date(2026, 7, 2, 9, 8)

    expect(formatMessageTime(createdAt.getTime(), now)).toBe(
      new Intl.DateTimeFormat(messageTimeLocale, timeFormatterOptions).format(createdAt),
    )
  })

  it('labels messages from yesterday', () => {
    const createdAt = new Date(2026, 7, 1, 9, 8)

    expect(formatMessageTime(createdAt.getTime(), now)).toBe(
      `Yesterday ${new Intl.DateTimeFormat(messageTimeLocale, timeFormatterOptions).format(createdAt)}`,
    )
  })

  it('shows the date and time for earlier messages in the current year', () => {
    const createdAt = new Date(2026, 6, 31, 9, 8)

    expect(formatMessageTime(createdAt.getTime(), now)).toBe(
      new Intl.DateTimeFormat(messageTimeLocale, dateTimeFormatterOptions).format(createdAt),
    )
  })

  it('includes the year for messages from previous years', () => {
    const createdAt = new Date(2025, 11, 31, 9, 8)

    expect(formatMessageTime(createdAt.getTime(), now)).toBe(
      new Intl.DateTimeFormat(messageTimeLocale, dateTimeWithYearFormatterOptions).format(
        createdAt,
      ),
    )
  })
})
