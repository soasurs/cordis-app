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

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

export function formatMessageTime(createdAt: number, now = new Date()) {
  const date = new Date(createdAt)
  const formatTime = (value: Date) =>
    new Intl.DateTimeFormat(messageTimeLocale, timeFormatterOptions).format(value)

  if (isSameCalendarDay(date, now)) {
    return formatTime(date)
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) {
    return `Yesterday ${formatTime(date)}`
  }

  const formatterOptions =
    date.getFullYear() === now.getFullYear()
      ? dateTimeFormatterOptions
      : dateTimeWithYearFormatterOptions

  return new Intl.DateTimeFormat(messageTimeLocale, formatterOptions).format(date)
}
