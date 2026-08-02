import type { MentionTrigger } from '@/features/messages/mention-types'

export function findMentionTrigger(value: string, cursor: number): MentionTrigger | undefined {
  const prefix = value.slice(0, cursor)
  const match = /(?:^|[\s([{"'`])@([^\s@<>]*)$/.exec(prefix)
  if (!match) return undefined

  const atOffset = match[0].lastIndexOf('@')
  return {
    end: cursor,
    query: match[1] ?? '',
    start: match.index + atOffset,
  }
}

export function extractDirectMentionUserIds(content: string): string[] {
  const ids = new Set<string>()
  const pattern = /<@!?([0-9]+)>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content))) {
    if (!isEscaped(content, match.index) && match[1]) ids.add(match[1])
  }
  return [...ids]
}

/** Whether content contains an unescaped role or @everyone mention. */
export function containsRoleOrEveryoneMention(content: string) {
  return extractRoleOrEveryoneMentionTokens(content).size > 0
}

export function containsNewRoleOrEveryoneMention(previousContent: string, nextContent: string) {
  const previousTokens = extractRoleOrEveryoneMentionTokens(previousContent)
  for (const token of extractRoleOrEveryoneMentionTokens(nextContent)) {
    if (!previousTokens.has(token)) return true
  }
  return false
}

export function isMentionBoundary(content: string, index: number) {
  const previous = content[index - 1]
  return !previous || !/[\p{L}\p{N}_]/u.test(previous)
}

export function isEscaped(content: string, index: number) {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0 && content[cursor] === '\\'; cursor -= 1) {
    slashCount += 1
  }
  return slashCount % 2 === 1
}

function extractRoleOrEveryoneMentionTokens(content: string) {
  const tokens = new Set<string>()
  const pattern = /<@&[0-9]+>|@everyone(?![\p{L}\p{N}_])/gu
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content))) {
    if (isEscaped(content, match.index)) continue
    if (match[0] === '@everyone' && !isMentionBoundary(content, match.index)) continue
    tokens.add(match[0])
  }
  return tokens
}
