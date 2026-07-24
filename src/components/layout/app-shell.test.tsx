import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { describe, expect, it } from 'vitest'

import { HomePage } from '@/features/home/pages/home-page'

import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('renders the personal home layout for the current user', () => {
    render(
      <TooltipProvider>
        <AppShell
          gatewayStatus={{ errorCode: null, state: 'ready' }}
          user={{ name: 'Alex Chen', username: 'alex_chen' }}
        >
          <HomePage displayName="Alex Chen" gatewayStatus={{ errorCode: null, state: 'ready' }} />
        </AppShell>
      </TooltipProvider>,
    )

    expect(screen.getByRole('navigation', { name: 'Spaces' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Home navigation' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome, Alex.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Start connecting' })).toBeInTheDocument()
    expect(screen.getByText('No recent conversations')).toBeInTheDocument()
    expect(screen.getByText('@alex_chen')).toBeInTheDocument()
    expect(screen.getAllByText('Connected')).not.toHaveLength(0)
  })
})
