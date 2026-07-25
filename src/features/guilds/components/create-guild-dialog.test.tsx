import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { guildsQueryKey, type GuildSummary } from '@/features/guilds/guild-queries'
import { useCreateGuildDialog } from '@/stores/create-guild-dialog'

import { CreateGuildDialog } from './create-guild-dialog'

const guildApi = vi.hoisted(() => ({ createGuild: vi.fn() }))

vi.mock('@/api/guild', () => guildApi)

const createdGuild: GuildSummary = {
  createdAt: 1_000,
  description: '',
  iconAssetId: '0',
  id: '42',
  name: 'Cordis Studio',
  ownerId: '7',
  revision: 1,
  updatedAt: 1_000,
}

beforeEach(() => {
  vi.clearAllMocks()
  useCreateGuildDialog.setState({ openState: false })
})

describe('CreateGuildDialog', () => {
  it('validates and creates a community from the modal', async () => {
    guildApi.createGuild.mockResolvedValue(createdGuild)
    const queryClient = renderDialog()
    const user = userEvent.setup()

    act(() => useCreateGuildDialog.getState().open())
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create community' }))
    expect(screen.getByText('Enter a community name')).toBeInTheDocument()
    expect(guildApi.createGuild).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/^Community name/), '  Cordis Studio  ')
    await user.click(screen.getByRole('button', { name: 'Create community' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(guildApi.createGuild.mock.calls[0]?.[0]).toBe('Cordis Studio')
    expect(queryClient.getQueryData(guildsQueryKey)).toEqual([createdGuild])
  })

  it('keeps the form open with a safe API error', async () => {
    guildApi.createGuild.mockRejectedValue(new Error('private server details'))
    renderDialog()
    const user = userEvent.setup()

    act(() => useCreateGuildDialog.getState().open())
    await user.type(screen.getByLabelText(/^Community name/), 'Cordis Studio')
    await user.click(screen.getByRole('button', { name: 'Create community' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to create this community. Please try again.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Community name/)).toHaveValue('Cordis Studio')
  })
})

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <CreateGuildDialog />
    </QueryClientProvider>,
  )
  return queryClient
}
