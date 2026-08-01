import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MessageComposer } from '@/features/messages/components/message-composer'
import { MessageItem } from '@/features/messages/components/message-item'
import {
  channelMessagesQueryKey,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'

const messageApi = vi.hoisted(() => ({
  abortAttachmentUpload: vi.fn(),
  completeAttachmentUpload: vi.fn(),
  createAttachmentUpload: vi.fn(),
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  getMessage: vi.fn(),
  listMessages: vi.fn(),
  MessageType: { DEFAULT: 1, REPLY: 19 },
  updateMessage: vi.fn(),
}))

const uploadApi = vi.hoisted(() => ({
  uploadMessageAttachment: vi.fn(),
}))

vi.mock('@/api/message', () => messageApi)
vi.mock('@/features/messages/upload-attachment', () => uploadApi)

const sampleMessage: ChannelMessageSummary = {
  attachments: [],
  author: {
    avatarAssetId: '0',
    bio: '',
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
  mentionEveryone: false,
  mentionRoleIds: [],
  mentionUserIds: [],
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

    await waitFor(() =>
      expect(messageApi.createMessage).toHaveBeenCalledWith({
        attachmentAssetIds: [],
        channelId: '43',
        content: 'Ship it',
        idempotencyKey: expect.any(String),
      }),
    )
    expect(screen.getByLabelText('Message #general')).toHaveValue('')
  })

  it('converts a selected member into server-side mention markup', async () => {
    const user = userEvent.setup()
    messageApi.createMessage.mockResolvedValue({
      ...sampleMessage,
      content: '<@7> welcome',
      id: '203',
    })
    const queryClient = createQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer
          canSend
          channelId="43"
          channelName="general"
          mentionCandidates={[{ id: '7', kind: 'user', label: 'Alex Chen', token: '<@7>' }]}
        />
      </QueryClientProvider>,
    )

    const composer = screen.getByLabelText('Message #general')
    await user.type(composer, '@ale')
    await user.click(screen.getByRole('option', { name: '@Alex Chen' }))
    await user.type(composer, ' welcome')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(messageApi.createMessage).toHaveBeenCalledWith({
        attachmentAssetIds: [],
        channelId: '43',
        content: '<@7> welcome',
        idempotencyKey: expect.any(String),
      }),
    )
  })

  it('blocks role and everyone mentions before sending without permission', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageComposer
          canSend
          canMentionRolesAndEveryone={false}
          channelId="43"
          channelName="general"
          mentionCandidates={[
            { id: 'everyone', kind: 'everyone', label: 'everyone', token: '@everyone' },
            { id: '50', kind: 'role', label: 'Designers', token: '<@&50>' },
            { id: '7', kind: 'user', label: 'Alex Chen', token: '<@7>' },
          ]}
        />
      </QueryClientProvider>,
    )

    const composer = screen.getByLabelText('Message #general')
    await user.type(composer, 'hello @everyone')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(messageApi.createMessage).not.toHaveBeenCalled()
    expect(
      screen.getByText('You do not have permission to mention roles or everyone in this channel.'),
    ).toBeInTheDocument()
    expect(composer).toHaveValue('hello @everyone')
  })

  it('uses the server mention search when local candidates are not provided', async () => {
    const user = userEvent.setup()
    const onSearchMentionCandidates = vi
      .fn()
      .mockResolvedValue([{ id: '7', kind: 'user', label: 'Alex Chen', token: '<@7>' }])
    messageApi.createMessage.mockResolvedValue({
      ...sampleMessage,
      content: '<@7> welcome',
      id: '204',
    })

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageComposer
          canSend
          channelId="43"
          channelName="general"
          onSearchMentionCandidates={onSearchMentionCandidates}
        />
      </QueryClientProvider>,
    )

    const composer = screen.getByLabelText('Message #general')
    await user.type(composer, '@ale')
    expect(onSearchMentionCandidates).toHaveBeenCalledWith('ale')
    await user.click(await screen.findByRole('option', { name: '@Alex Chen' }))
    await user.type(composer, ' welcome')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(messageApi.createMessage).toHaveBeenCalledWith({
        attachmentAssetIds: [],
        channelId: '43',
        content: '<@7> welcome',
        idempotencyKey: expect.any(String),
      }),
    )
  })

  it('keeps the load-more action available when the current page has no match', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageComposer
          canSend
          channelId="43"
          channelName="general"
          mentionCandidates={[{ id: '7', kind: 'user', label: 'Alex Chen', token: '<@7>' }]}
          onLoadMoreMentionCandidates={onLoadMore}
        />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Message #general'), '@zzz')

    expect(screen.getByText('No matches on this page.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load more members…' }))
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('sends a reply with both reference ids and clears the reply bar', async () => {
    const user = userEvent.setup()
    const onClearReply = vi.fn()
    messageApi.createMessage.mockResolvedValue({
      ...sampleMessage,
      content: 'Agreed',
      id: '201',
      referencedChannelId: '43',
      referencedMessageId: '102',
      type: 19,
    })
    const queryClient = createQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer
          canSend
          channelId="43"
          channelName="general"
          replyTo={{
            authorName: 'Alex Chen',
            channelId: '43',
            contentPreview: 'Hello room',
            id: '102',
          }}
          onClearReply={onClearReply}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByText('Replying to Alex Chen')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Message #general'), 'Agreed')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(messageApi.createMessage).toHaveBeenCalledWith({
        attachmentAssetIds: [],
        channelId: '43',
        content: 'Agreed',
        idempotencyKey: expect.any(String),
        referencedChannelId: '43',
        referencedMessageId: '102',
      }),
    )
    await waitFor(() => expect(onClearReply).toHaveBeenCalled())
  })

  it('uploads an attachment and sends its asset id', async () => {
    const user = userEvent.setup()
    uploadApi.uploadMessageAttachment.mockResolvedValue({
      assetId: '900',
      contentType: 'image/png',
      filename: 'shot.png',
      height: 0,
      size: 4,
      url: 'https://cdn.example.com/shot.png',
      urlExpiresAt: 0,
      width: 0,
    })
    messageApi.createMessage.mockResolvedValue({
      ...sampleMessage,
      attachments: [
        {
          assetId: '900',
          contentType: 'image/png',
          filename: 'shot.png',
          height: 0,
          size: 4,
          url: 'https://cdn.example.com/shot.png',
          urlExpiresAt: 0,
          width: 0,
        },
      ],
      content: '',
      id: '201',
    })
    const queryClient = createQueryClient()
    queryClient.setQueryData(channelMessagesQueryKey('43'), {
      pageParams: [undefined],
      pages: [{ messages: [] }],
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer canSend channelId="43" channelName="general" />
      </QueryClientProvider>,
    )

    const input = container.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    await user.upload(
      input as HTMLInputElement,
      new File(['abcd'], 'shot.png', { type: 'image/png' }),
    )

    expect(await screen.findByRole('img', { name: 'shot.png' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(messageApi.createMessage).toHaveBeenCalledWith({
        attachmentAssetIds: ['900'],
        channelId: '43',
        content: '',
        idempotencyKey: expect.any(String),
      }),
    )
  })

  it('keeps the complete message intent when sending with an attachment fails', async () => {
    const user = userEvent.setup()
    uploadApi.uploadMessageAttachment.mockResolvedValue({
      assetId: '902',
      contentType: 'image/png',
      filename: 'retry.png',
      height: 0,
      size: 4,
      url: 'https://cdn.example.com/retry.png',
      urlExpiresAt: 0,
      width: 0,
    })
    messageApi.createMessage
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ...sampleMessage, content: 'Retry me', id: '202' })
    const queryClient = createQueryClient()

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer canSend channelId="43" channelName="general" />
      </QueryClientProvider>,
    )

    await user.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['abcd'], 'retry.png', { type: 'image/png' }),
    )
    expect(await screen.findByRole('img', { name: 'retry.png' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Message #general'), 'Retry me')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('img', { name: 'retry.png' })).toBeInTheDocument()
    const firstKey = messageApi.createMessage.mock.calls[0]?.[0].idempotencyKey

    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(messageApi.createMessage).toHaveBeenCalledTimes(2))

    expect(messageApi.createMessage.mock.calls[1]?.[0].idempotencyKey).toBe(firstKey)
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: 'retry.png' })).not.toBeInTheDocument(),
    )
  })

  it('retries an interrupted attachment creation with the same key', async () => {
    const user = userEvent.setup()
    uploadApi.uploadMessageAttachment
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        assetId: '903',
        contentType: 'image/png',
        filename: 'retry-upload.png',
        height: 0,
        size: 4,
        url: 'https://cdn.example.com/retry-upload.png',
        urlExpiresAt: 0,
        width: 0,
      })
    const queryClient = createQueryClient()

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer canSend channelId="43" channelName="general" />
      </QueryClientProvider>,
    )
    const file = new File(['abcd'], 'retry-upload.png', { type: 'image/png' })

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file)
    await screen.findByText('Unable to upload this file. Please try again.')
    const firstKey = uploadApi.uploadMessageAttachment.mock.calls[0]?.[2]

    await user.click(screen.getByRole('button', { name: 'Retry retry-upload.png' }))
    await waitFor(() => expect(uploadApi.uploadMessageAttachment).toHaveBeenCalledTimes(2))

    expect(uploadApi.uploadMessageAttachment.mock.calls[1]?.[2]).toBe(firstKey)
    expect(await screen.findByRole('img', { name: 'retry-upload.png' })).toBeInTheDocument()
  })

  it('does not reuse a message intent after the channel changes', async () => {
    const user = userEvent.setup()
    messageApi.createMessage
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ...sampleMessage, channelId: '44', content: 'Retry me', id: '203' })
    const queryClient = createQueryClient()

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer canSend channelId="43" channelName="general" />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Message #general'), 'Retry me')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByRole('alert')
    const firstKey = messageApi.createMessage.mock.calls[0]?.[0].idempotencyKey

    rerender(
      <QueryClientProvider client={queryClient}>
        <MessageComposer canSend channelId="44" channelName="random" />
      </QueryClientProvider>,
    )
    await user.type(screen.getByLabelText('Message #random'), 'Retry me')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(messageApi.createMessage).toHaveBeenCalledTimes(2))
    expect(messageApi.createMessage.mock.calls[1]?.[0].channelId).toBe('44')
    expect(messageApi.createMessage.mock.calls[1]?.[0].idempotencyKey).not.toBe(firstKey)
  })

  it('shows a filename chip for non-image attachments', async () => {
    const user = userEvent.setup()
    uploadApi.uploadMessageAttachment.mockResolvedValue({
      assetId: '901',
      contentType: 'application/pdf',
      filename: 'notes.pdf',
      height: 0,
      size: 4,
      url: 'https://cdn.example.com/notes.pdf',
      urlExpiresAt: 0,
      width: 0,
    })
    const queryClient = createQueryClient()

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer canSend channelId="43" channelName="general" />
      </QueryClientProvider>,
    )

    const input = container.querySelector('input[type="file"]')
    await user.upload(
      input as HTMLInputElement,
      new File(['abcd'], 'notes.pdf', { type: 'application/pdf' }),
    )

    expect(await screen.findByText('notes.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'notes.pdf' })).not.toBeInTheDocument()
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
  it('supports mention selection while editing', async () => {
    const user = userEvent.setup()
    messageApi.updateMessage.mockResolvedValue({
      ...sampleMessage,
      content: '<@7>',
      editedAt: 3_000,
      revision: 2,
      updatedAt: 3_000,
    })
    const message = {
      ...sampleMessage,
      content: 'Hello room',
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem
          currentUserId="7"
          message={message}
          mentionCandidates={[{ id: '7', kind: 'user', label: 'Alex Chen', token: '<@7>' }]}
        />
      </QueryClientProvider>,
    )

    fireEvent.contextMenu(screen.getByRole('article'))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const editor = screen.getByDisplayValue('Hello room')
    await user.clear(editor)
    await user.type(editor, '@ale')
    await user.click(screen.getByRole('option', { name: '@Alex Chen' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(messageApi.updateMessage).toHaveBeenCalledWith('102', {
        attachmentAssetIds: [],
        content: '<@7>',
      }),
    )
  })

  it('blocks role mentions before saving an edit without permission', async () => {
    const user = userEvent.setup()
    const message = {
      ...sampleMessage,
      content: 'Hello room',
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem
          canMentionRolesAndEveryone={false}
          currentUserId="7"
          message={message}
        />
      </QueryClientProvider>,
    )

    fireEvent.contextMenu(screen.getByRole('article'))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const editor = screen.getByDisplayValue('Hello room')
    await user.clear(editor)
    await user.type(editor, '<@&50> hello')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(messageApi.updateMessage).not.toHaveBeenCalled()
    expect(
      screen.getByText('You do not have permission to mention roles or everyone in this channel.'),
    ).toBeInTheDocument()
  })

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

    fireEvent.contextMenu(screen.getByRole('article'))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const editor = screen.getByDisplayValue('Hello room')
    await user.clear(editor)
    await user.type(editor, 'Updated')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(messageApi.updateMessage).toHaveBeenCalledWith('102', {
        attachmentAssetIds: [],
        content: 'Updated',
      }),
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

    fireEvent.contextMenu(screen.getByRole('article'))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(messageApi.deleteMessage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(messageApi.deleteMessage).toHaveBeenCalledWith('102'))
  })

  it('renders image attachments inline and files as cards', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem
          currentUserId="7"
          message={{
            ...sampleMessage,
            attachments: [
              {
                assetId: '1',
                contentType: 'image/png',
                filename: 'shot.png',
                height: 10,
                size: 12,
                url: 'https://cdn.example.com/shot.png',
                urlExpiresAt: 0,
                width: 20,
              },
              {
                assetId: '2',
                contentType: 'application/pdf',
                filename: 'notes.pdf',
                height: 0,
                size: 20_480,
                url: 'https://cdn.example.com/notes.pdf',
                urlExpiresAt: 0,
                width: 0,
              },
              {
                assetId: '3',
                contentType: 'video/mp4',
                filename: 'clip.mp4',
                height: 0,
                size: 1_024_000,
                url: 'https://cdn.example.com/clip.mp4',
                urlExpiresAt: 0,
                width: 0,
              },
            ],
            content: '',
          }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('img', { name: 'shot.png' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/shot.png',
    )
    expect(screen.getByRole('link', { name: /notes\.pdf/i })).toHaveAttribute(
      'href',
      'https://cdn.example.com/notes.pdf',
    )
    expect(screen.getByText('20 KB · PDF')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play clip.mp4' })).toBeInTheDocument()
    expect(screen.getByLabelText('clip.mp4')).toHaveAttribute(
      'src',
      'https://cdn.example.com/clip.mp4',
    )
  })

  it('hides edit actions for other authors without manageMessages', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem currentUserId="99" message={sampleMessage} />
      </QueryClientProvider>,
    )

    fireEvent.contextMenu(screen.getByRole('article'))
    expect(screen.queryByRole('menu', { name: 'Message actions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('offers reply for other authors when onReply is provided', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn()

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem currentUserId="99" message={sampleMessage} onReply={onReply} />
      </QueryClientProvider>,
    )

    fireEvent.contextMenu(screen.getByRole('article'))
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Reply' }))
    expect(onReply).toHaveBeenCalledWith(sampleMessage)
  })

  it('shows a reply preview from the channel cache', () => {
    const queryClient = createQueryClient()
    const original: ChannelMessageSummary = {
      ...sampleMessage,
      content: 'Original thought',
      id: '101',
    }
    queryClient.setQueryData(channelMessagesQueryKey('43'), {
      pageParams: [undefined],
      pages: [{ messages: [original] }],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MessageItem
          currentUserId="7"
          message={{
            ...sampleMessage,
            content: 'Agreed',
            id: '201',
            referencedChannelId: '43',
            referencedMessageId: '101',
            type: 19,
          }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByText('Original thought')).toBeInTheDocument()
    expect(screen.getByText('Agreed')).toBeInTheDocument()
    expect(messageApi.getMessage).not.toHaveBeenCalled()
  })

  it('falls back when the referenced message cannot be loaded', async () => {
    messageApi.getMessage.mockRejectedValue(new Error('not found'))

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem
          currentUserId="7"
          message={{
            ...sampleMessage,
            content: 'Agreed',
            id: '201',
            referencedChannelId: '43',
            referencedMessageId: '999',
            type: 19,
          }}
        />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.getByText('Original message was deleted')).toBeInTheDocument(),
    )
  })

  it('keeps reply previews clickable when the target is only loaded via getMessage', async () => {
    const user = userEvent.setup()
    const onJumpToMessage = vi.fn()
    messageApi.getMessage.mockResolvedValue({
      ...sampleMessage,
      content: 'Far away',
      id: '50',
    })

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem
          currentUserId="7"
          message={{
            ...sampleMessage,
            content: 'Agreed',
            id: '201',
            referencedChannelId: '43',
            referencedMessageId: '50',
            type: 19,
          }}
          onJumpToMessage={onJumpToMessage}
        />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('Far away')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Far away/i }))
    expect(onJumpToMessage).toHaveBeenCalledWith('50')
  })

  it('lets manageMessages delete another author message without edit', async () => {
    const user = userEvent.setup()
    messageApi.deleteMessage.mockResolvedValue(undefined)
    const queryClient = createQueryClient()
    queryClient.setQueryData(channelMessagesQueryKey('43'), {
      pageParams: [undefined],
      pages: [{ messages: [sampleMessage] }],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MessageItem canManageMessages currentUserId="99" message={sampleMessage} />
      </QueryClientProvider>,
    )

    fireEvent.contextMenu(screen.getByRole('article'))
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(messageApi.deleteMessage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(messageApi.deleteMessage).toHaveBeenCalledWith('102'))
  })

  it('edits attachments by removing kept files and uploading new ones', async () => {
    const user = userEvent.setup()
    const withAttachment: ChannelMessageSummary = {
      ...sampleMessage,
      attachments: [
        {
          assetId: '1',
          contentType: 'image/png',
          filename: 'old.png',
          height: 10,
          size: 12,
          url: 'https://cdn.example.com/old.png',
          urlExpiresAt: 0,
          width: 20,
        },
      ],
      content: 'With file',
    }
    messageApi.updateMessage.mockResolvedValue({
      ...withAttachment,
      attachments: [
        {
          assetId: '2',
          contentType: 'application/pdf',
          filename: 'new.pdf',
          height: 0,
          size: 40,
          url: 'https://cdn.example.com/new.pdf',
          urlExpiresAt: 0,
          width: 0,
        },
      ],
      editedAt: 4_000,
      revision: 2,
      updatedAt: 4_000,
    })
    uploadApi.uploadMessageAttachment.mockResolvedValue({
      assetId: '2',
      contentType: 'application/pdf',
      filename: 'new.pdf',
      height: 0,
      size: 40,
      url: 'https://cdn.example.com/new.pdf',
      urlExpiresAt: 0,
      width: 0,
    })

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <MessageItem currentUserId="7" message={withAttachment} />
      </QueryClientProvider>,
    )

    fireEvent.contextMenu(screen.getByRole('article'))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Remove old.png' }))

    const input = container.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    await user.upload(
      input as HTMLInputElement,
      new File(['pdf'], 'new.pdf', { type: 'application/pdf' }),
    )
    await screen.findByText('new.pdf')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(messageApi.updateMessage).toHaveBeenCalledWith('102', {
        attachmentAssetIds: ['2'],
        content: 'With file',
      }),
    )
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}
