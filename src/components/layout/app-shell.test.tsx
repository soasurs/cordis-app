import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { describe, expect, it } from 'vitest'

import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('renders the initial workspace layout', () => {
    render(
      <TooltipProvider>
        <AppShell />
      </TooltipProvider>,
    )

    expect(screen.getByRole('navigation', { name: 'Spaces' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cordis Studio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'general' })).toBeInTheDocument()
    expect(screen.getByText('This is where the conversation begins.')).toBeInTheDocument()
  })
})
