import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SelectMenu } from '@/components/ui/select-menu'

const options = [
  { label: 'Online', value: 'online' },
  { label: 'Idle', value: 'idle' },
  { label: 'Do not disturb', value: 'dnd' },
] as const

describe('SelectMenu', () => {
  it('selects an option from the custom listbox', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <SelectMenu
        ariaLabel="Choose status"
        onValueChange={onValueChange}
        options={options}
        value="online"
      >
        Online
      </SelectMenu>,
    )

    await user.click(screen.getByRole('combobox', { name: 'Choose status' }))

    expect(screen.getByRole('option', { name: 'Online' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('option', { name: 'Do not disturb' }))

    expect(onValueChange).toHaveBeenCalledWith('dnd')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports keyboard navigation and restores focus after selection', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <SelectMenu
        ariaLabel="Choose status"
        onValueChange={onValueChange}
        options={options}
        value="online"
      >
        Online
      </SelectMenu>,
    )

    const trigger = screen.getByRole('combobox', { name: 'Choose status' })
    trigger.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('idle')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
