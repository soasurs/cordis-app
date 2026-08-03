import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/pages/home-page'
import type { DmChannelPage } from '@/api/dm'
import { dmChannelsQueryKey } from '@/features/dm/dm-queries'
import type { RelationshipPage } from '@/api/relationship'
import { relationshipListQueryKey } from '@/features/friends/relationship-queries'

import { GatewayPresencePreferenceContext } from '@/app/gateway-context'
import { AppShell } from '@/components/layout/app-shell'

describe('AppShell', () => {
  it('renders the personal home layout for the current user', () => {
    const queryClient = createQueryClient()
    const onSelectFriends = vi.fn()
    const onSelectGuild = vi.fn()
    queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [{ channels: [], nextCursor: undefined }],
    })
    queryClient.setQueryData<InfiniteData<RelationshipPage>>(
      relationshipListQueryKey('incoming'),
      {
        pageParams: [undefined],
        pages: [{ relationships: [], nextCursor: undefined }],
      },
    )
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppShell
            gatewayStatus={{ errorCode: null, state: 'ready' }}
            guilds={[
              {
                iconAssetId: '0',
                id: '42',
                name: 'Cordis Studio',
              },
            ]}
            onSelectFriends={onSelectFriends}
            onSelectGuild={onSelectGuild}
            user={{ name: 'Alex Chen', username: 'alex_chen' }}
          >
            <HomePage displayName="Alex Chen" gatewayStatus={{ errorCode: null, state: 'ready' }} />
          </AppShell>
        </TooltipProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('navigation', { name: 'Spaces' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cordis Studio' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cordis Studio' }))
    expect(onSelectGuild).toHaveBeenCalledWith('42')
    expect(screen.getAllByRole('navigation', { name: 'Home navigation' })).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Friends' })[0]!)
    expect(onSelectFriends).toHaveBeenCalledOnce()
    expect(screen.queryByText('Message requests')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome, Alex.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Start connecting' })).toBeInTheDocument()
    expect(screen.getByText('No recent conversations')).toBeInTheDocument()
    expect(screen.getByText('@alex_chen')).toBeInTheDocument()
    expect(screen.getAllByText('Connected')).not.toHaveLength(0)
  })

  it('offers the selected status from the global layout', () => {
    const queryClient = createQueryClient()
    const setStatus = vi.fn()
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GatewayPresencePreferenceContext value={{ setStatus, status: 'online' }}>
            <AppShell user={{ name: 'Alex Chen', username: 'alex_chen' }}>
              <p>Content</p>
            </AppShell>
          </GatewayPresencePreferenceContext>
        </TooltipProvider>
      </QueryClientProvider>,
    )

    const statusControls = screen.getAllByRole('combobox', { name: 'Set presence status' })
    fireEvent.click(statusControls[0])
    fireEvent.click(screen.getByRole('option', { name: 'Do not disturb' }))

    expect(setStatus).toHaveBeenCalledWith('dnd')
  })

  it('opens the presence selector from the current user panel', () => {
    const queryClient = createQueryClient()
    const setStatus = vi.fn()
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GatewayPresencePreferenceContext value={{ setStatus, status: 'online' }}>
            <AppShell user={{ name: 'Alex Chen', username: 'alex_chen' }}>
              <p>Content</p>
            </AppShell>
          </GatewayPresencePreferenceContext>
        </TooltipProvider>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('combobox', { name: 'Set presence status for Alex Chen' }))
    fireEvent.click(screen.getByRole('option', { name: 'Idle' }))

    expect(setStatus).toHaveBeenCalledWith('idle')
  })

  it('navigates to messages and opens the selected DM conversation', () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [
        {
          channels: [
            {
              channelId: '43',
              createdAt: 1_000,
              recipient: {
                avatarAssetId: '0',
                bio: '',
                createdAt: 1_000,
                name: 'Alex Chen',
                updatedAt: 1_000,
                userId: '8',
                username: 'alex_chen',
              },
            },
          ],
          nextCursor: undefined,
        },
      ],
    })
    const onSelectDm = vi.fn()
    const onOpenNewDm = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppShell
            activeDmChannelId="43"
            activePersonalSection="dm"
            onOpenNewDm={onOpenNewDm}
            onSelectDm={onSelectDm}
            user={{ name: 'Alex Chen', username: 'alex_chen' }}
          >
            <p>Content</p>
          </AppShell>
        </TooltipProvider>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Messages' })[0]!)
    expect(onSelectDm).toHaveBeenCalledWith()

    const conversation = screen.getByRole('button', { name: /@alex_chen/ })
    expect(conversation).toHaveAttribute('aria-current', 'page')
    fireEvent.click(conversation)
    expect(onSelectDm).toHaveBeenCalledWith('43')

    fireEvent.click(screen.getByRole('button', { name: 'Start a direct message' }))
    expect(onOpenNewDm).toHaveBeenCalled()
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}
