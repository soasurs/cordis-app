import { createElement } from 'react'
import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createMentionCandidates,
  createMentionCandidatesFromSearch,
  containsNewRoleOrEveryoneMention,
  containsRoleOrEveryoneMention,
  extractDirectMentionUserIds,
  filterMentionCandidatesByPermission,
  filterMentionCandidates,
  findMentionTrigger,
  renderMentionDraftContent,
  renderMessageContent,
  replaceMentionTrigger,
  type MentionCandidate,
  useMentionInput,
} from '@/features/messages/mentions'

afterEach(() => {
  vi.useRealTimers()
})

const candidates: MentionCandidate[] = [
  {
    id: 'everyone',
    kind: 'everyone',
    label: 'everyone',
    token: '@everyone',
  },
  {
    id: '50',
    kind: 'role',
    label: 'Designers',
    token: '<@&50>',
  },
  {
    id: '7',
    kind: 'user',
    label: 'Alex Chen',
    secondaryLabel: '@alex_chen',
    token: '<@7>',
  },
]

describe('message mentions', () => {
  it('extracts only unescaped direct user mention markup', () => {
    expect(extractDirectMentionUserIds('Hi <@7> <@!8> <@&50> \\<@9> <@7>')).toEqual(['7', '8'])
  })

  it('finds only an @ trigger at a word boundary', () => {
    expect(findMentionTrigger('hello @ale', 10)).toEqual({ end: 10, query: 'ale', start: 6 })
    expect(findMentionTrigger('hello email@example', 19)).toBeUndefined()
    expect(findMentionTrigger('hello @ale', 8)).toEqual({ end: 8, query: 'a', start: 6 })
  })

  it('filters candidates by display name and username', () => {
    expect(filterMentionCandidates(candidates, 'ALEX').map((item) => item.id)).toEqual(['7'])
    expect(filterMentionCandidates(candidates, 'design').map((item) => item.id)).toEqual(['50'])
  })

  it('hides everyone and role candidates without the shared mention permission', () => {
    expect(filterMentionCandidatesByPermission(candidates, false)).toEqual([candidates[2]])
    expect(filterMentionCandidatesByPermission(candidates, true)).toEqual(candidates)
  })

  it('keeps full candidates for rendering but filters draft candidates', () => {
    const { result } = renderHook(() => useMentionInputForTest(false))

    expect(result.current.mentionCandidates).toEqual(candidates)
    expect(result.current.draftMentionCandidates).toEqual([candidates[2]])
  })

  it('detects unescaped role and everyone markup for submit validation', () => {
    expect(containsRoleOrEveryoneMention('<@&50>')).toBe(true)
    expect(containsRoleOrEveryoneMention('hello @everyone')).toBe(true)
    expect(containsRoleOrEveryoneMention('hello \\@everyone \\<@&50>')).toBe(false)
    expect(containsRoleOrEveryoneMention('hello @everyones')).toBe(false)
    expect(containsNewRoleOrEveryoneMention('hello <@&50>', 'hello <@&50>')).toBe(false)
    expect(containsNewRoleOrEveryoneMention('hello <@&50>', 'hello <@&50> @everyone')).toBe(true)
  })

  it('debounces remote mention searches', () => {
    vi.useFakeTimers()
    const search = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => useMentionInputForTest(true, search))

    act(() => result.current.updateDraft('@ale', 4))
    expect(search).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(199))
    expect(search).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(search).toHaveBeenCalledOnce()
    expect(search).toHaveBeenCalledWith('ale')
  })

  it('does not search remote mention candidates without a query', () => {
    vi.useFakeTimers()
    const search = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => useMentionInputForTest(true, search))

    act(() => result.current.updateDraft('@', 1))
    act(() => vi.advanceTimersByTime(1_000))

    expect(search).not.toHaveBeenCalled()
    expect(result.current.isMentionSearchPending).toBe(false)
    expect(result.current.showMentionSuggestions).toBe(false)
  })

  it('maps server mention search results into user and role candidates', () => {
    expect(
      createMentionCandidatesFromSearch(
        [
          {
            avatarAssetId: '9',
            name: 'Alex Chen',
            nickname: 'Alex',
            userId: '7',
            username: 'alex_chen',
          },
        ],
        [
          {
            createdAt: 1_000,
            guildId: '42',
            id: '50',
            isDefault: false,
            name: 'Designers',
            permissions: '0',
            position: 1,
            revision: 1,
            updatedAt: 1_000,
          },
        ],
      ),
    ).toEqual([
      expect.objectContaining({
        id: 'everyone',
        kind: 'everyone',
        token: '@everyone',
      }),
      expect.objectContaining({ id: '50', kind: 'role', token: '<@&50>' }),
      expect.objectContaining({
        id: '7',
        kind: 'user',
        label: 'Alex',
        secondaryLabel: '@alex_chen',
        token: '<@7>',
      }),
    ])
  })

  it('replaces the trigger with server-side mention markup', () => {
    const trigger = findMentionTrigger('Ship to @ale', 12)
    expect(trigger).toBeDefined()
    expect(replaceMentionTrigger('Ship to @ale', trigger!, candidates[2]!)).toBe('Ship to <@7>')
  })

  it('renders only mentions confirmed by the Message service', () => {
    const nodes = renderMessageContent(
      {
        content: 'Hi <@7> <@&50> @everyone <@999>',
        mentionEveryone: true,
        mentionRoleIds: ['50'],
        mentionUserIds: ['7'],
      },
      candidates,
    )

    render(createElement('p', {}, nodes))
    expect(screen.getByText('@Alex Chen')).toBeInTheDocument()
    expect(screen.getByText('@Designers')).toBeInTheDocument()
    expect(screen.getByText('@everyone')).toBeInTheDocument()
    expect(screen.getByText(/<@999>/)).toBeInTheDocument()
  })

  it('renders known draft mentions with their display labels', () => {
    const nodes = renderMentionDraftContent('Hi <@7> <@!7> <@&50>', candidates)

    render(createElement('p', {}, nodes))
    expect(screen.getAllByText('@Alex Chen')).toHaveLength(2)
    expect(screen.getByText('@Designers')).toBeInTheDocument()
  })

  it('keeps the separator space outside a draft mention block', () => {
    const nodes = renderMentionDraftContent('<@7> ', candidates)

    render(createElement('p', {}, nodes))
    const mention = screen.getByText('@Alex Chen')
    expect(mention.textContent).toBe('@Alex Chen')
    expect(mention.nextSibling?.textContent).toBe(' ')
  })

  it('keeps escaped markup as plain text', () => {
    const nodes = renderMessageContent(
      {
        content: '\\@everyone and \\<@7> then @everyone',
        mentionEveryone: true,
        mentionRoleIds: [],
        mentionUserIds: ['7'],
      },
      candidates,
    )

    render(createElement('p', {}, nodes))
    expect(screen.getByText(/\\@everyone and \\<@7>/)).toBeInTheDocument()
    expect(screen.getByText('@everyone')).toBeInTheDocument()
  })

  it('does not expose the default role as a separate role mention', () => {
    expect(
      createMentionCandidates(
        [],
        [
          {
            createdAt: 1,
            guildId: '42',
            id: '42',
            isDefault: true,
            name: '@everyone',
            permissions: '0',
            position: 0,
            revision: 1,
            updatedAt: 1,
          },
        ],
      ),
    ).toHaveLength(1)
  })
})

function useMentionInputForTest(
  canMentionRolesAndEveryone: boolean,
  onSearch?: (query: string) => Promise<MentionCandidate[]>,
) {
  return useMentionInput(
    '',
    vi.fn(),
    candidates,
    undefined,
    undefined,
    onSearch,
    canMentionRolesAndEveryone,
  )
}
