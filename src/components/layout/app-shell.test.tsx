import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/pages/home-page'

import { GatewayPresencePreferenceContext } from '@/app/gateway-context'
import { AppShell } from '@/components/layout/app-shell'

describe('AppShell', () => {
  it('renders the personal home layout for the current user', () => {
    const onSelectGuild = vi.fn()
    render(
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
          onSelectGuild={onSelectGuild}
          user={{ name: 'Alex Chen', username: 'alex_chen' }}
        >
          <HomePage displayName="Alex Chen" gatewayStatus={{ errorCode: null, state: 'ready' }} />
        </AppShell>
      </TooltipProvider>,
    )

    expect(screen.getByRole('navigation', { name: 'Spaces' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cordis Studio' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cordis Studio' }))
    expect(onSelectGuild).toHaveBeenCalledWith('42')
    expect(screen.getByRole('navigation', { name: 'Home navigation' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome, Alex.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Start connecting' })).toBeInTheDocument()
    expect(screen.getByText('No recent conversations')).toBeInTheDocument()
    expect(screen.getByText('@alex_chen')).toBeInTheDocument()
    expect(screen.getAllByText('Connected')).not.toHaveLength(0)
  })

  it('offers the selected status from the global layout', () => {
    const setStatus = vi.fn()
    render(
      <TooltipProvider>
        <GatewayPresencePreferenceContext value={{ setStatus, status: 'online' }}>
          <AppShell user={{ name: 'Alex Chen', username: 'alex_chen' }}>
            <p>Content</p>
          </AppShell>
        </GatewayPresencePreferenceContext>
      </TooltipProvider>,
    )

    const statusControls = screen.getAllByRole('combobox', { name: 'Set presence status' })
    fireEvent.click(statusControls[0])
    fireEvent.click(screen.getByRole('option', { name: 'Do not disturb' }))

    expect(setStatus).toHaveBeenCalledWith('dnd')
  })

  it('opens the presence selector from the current user panel', () => {
    const setStatus = vi.fn()
    render(
      <TooltipProvider>
        <GatewayPresencePreferenceContext value={{ setStatus, status: 'online' }}>
          <AppShell user={{ name: 'Alex Chen', username: 'alex_chen' }}>
            <p>Content</p>
          </AppShell>
        </GatewayPresencePreferenceContext>
      </TooltipProvider>,
    )

    fireEvent.click(screen.getByRole('combobox', { name: 'Set presence status for Alex Chen' }))
    fireEvent.click(screen.getByRole('option', { name: 'Idle' }))

    expect(setStatus).toHaveBeenCalledWith('idle')
  })
})
