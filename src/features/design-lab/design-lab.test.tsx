import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DesignLab } from '@/features/design-lab/design-lab'

describe('DesignLab', () => {
  it('lets the reviewer try the conversation specimen', async () => {
    const user = userEvent.setup()
    render(<DesignLab />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Calm by default.Alive when it matters.',
    )
    const designLab = screen.getByRole('main')
    expect(designLab).toHaveAttribute('data-theme', 'light')
    expect(designLab).toHaveAttribute('data-palette', 'current')

    await user.click(screen.getByRole('button', { name: 'morandi' }))

    expect(designLab).toHaveAttribute('data-palette', 'morandi')

    await user.click(screen.getByRole('button', { name: 'pulse' }))

    expect(designLab).toHaveAttribute('data-palette', 'pulse')

    await user.click(screen.getByRole('button', { name: 'current' }))

    expect(designLab).toHaveAttribute('data-palette', 'current')

    await user.click(screen.getByRole('button', { name: 'dark' }))

    expect(designLab).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByText('Obsidian violet')).toBeInTheDocument()

    const muteNotifications = screen.getByRole('checkbox', { name: /Mute notifications/ })
    await user.click(muteNotifications)
    expect(muteNotifications).toBeChecked()

    const readReceipts = screen.getByRole('switch', { name: 'Show read receipts' })
    const switchThumb = readReceipts.querySelector('[data-slot="switch-thumb"]')
    expect(readReceipts).toHaveAttribute('aria-checked', 'true')
    expect(switchThumb).toHaveClass('translate-x-4')
    await user.click(readReceipts)
    expect(readReceipts).toHaveAttribute('aria-checked', 'false')
    expect(switchThumb).toHaveClass('translate-x-0')

    await user.click(screen.getByRole('tab', { name: 'Auth' }))
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Create account' }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Server settings' }))
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'User profile' }))
    expect(screen.getByRole('heading', { name: 'Profile and privacy' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Preview message'), 'This direction feels focused.')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByText('This direction feels focused.')).toBeInTheDocument()
    expect(screen.getByLabelText('Preview message')).toHaveValue('')
  })
})
