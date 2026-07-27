import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MessageComposer } from '@/features/messages/components/message-composer'
import { MessageItem } from '@/features/messages/components/message-item'
import {
  channelMessagesQueryKey,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'

const messageApi = vi.hoisted(() => ({
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  listMessages: vi.fn(),
  MessageType: { DEFAULT: 1 },
  updateMessage: vi.fn(),
}))

vi.mock('@/api/message', () => messageApi)

const sampleMessage: ChannelMessageSummary = {
  author: {
    avatarAssetId: '0',
    createdAt: 1_000,
    name: 'Alex Chen',
    updatedAt: 1_000,
    userId: '7',
    username: 'alex_chen',
  },
  channelId: '43',
  content: 'Hello room',
  createdAt: 2_000,
  editedAt: 0,
  flags: 0,
  id: '102',
  revision: 1,
  type: 1,
  updatedAt: 2_000,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MessageComposer', () => {
  it('sends a message and clears the draft', async () => {
    const user = userEvent.setup()
    messageApi.createMessage.mockResolvedValue({
      ...sampleMessage,
      content: 'Ship it',
      id: '200',
    })
    const queryClient = createQueryClient()
    queryClient.setQueryData(channelMessagesQueryKey('43'), {
      pageParams: [undefined],
      pages: [{ messages: [] }],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer canSend channelId="43" channelName="general" />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Message #general'), 'Ship it')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(messageApi.createMessage).toHaveBeenCalledWith({
      channelId: '43',
      content: 'Ship it',
    }))
    expect(screen.getByLabelText('Message #general')).toHaveValue('')
  })

  it('shows a permission notice when send is denied', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageComposer canSend={false} channelId="43" channelName="general" />
      </QueryClientProvider>,
    )

    expect(
      screen.getByText('You do not have permission to send messages in #general.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Message #general')).not.toBeInTheDocument()
  })
})

describe('MessageItem', () => {
  it('edits and deletes the current user message', async () => {
    const user = userEvent.setup()
    messageApi.updateMessage.mockResolvedValue({
      ...sampleMessage,
      content: 'Updated',
      editedAt: 3_000,
      revision: 2,
      updatedAt: 3_000,
    })
    messageApi.deleteMessage.mockResolvedValue(undefined)
    const queryClient = createQueryClient()
    queryClient.setQueryData(channelMessagesQueryKey('43'), {
      pageParams: [undefined],
      pages: [{ messages: [sampleMessage] }],
    })

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MessageItem currentUserId="7" message={sampleMessage} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const editor = screen.getByDisplayValue('Hello room')
    await user.clear(editor)
    await user.type(editor, 'Updated')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(messageApi.updateMessage).toHaveBeenCalledWith('102', { content: 'Updated' }),
    )

    rerender(
      <QueryClientProvider client={queryClient}>
        <MessageItem
          currentUserId="7"
          message={{
            ...sampleMessage,
            content: 'Updated',
            editedAt: 3_000,
            revision: 2,
            updatedAt: 3_000,
          }}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(messageApi.deleteMessage).toHaveBeenCalledWith('102'))
  })

  it('hides edit actions for other authors', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem currentUserId="99" message={sampleMessage} />
      </QueryClientProvider>,
    )

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}
