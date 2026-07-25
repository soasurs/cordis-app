import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GuildIcon } from '@/features/guilds/components/guild-icon'

describe('GuildIcon', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_MINIO_URL', 'http://storage.cordis.localhost:9000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders a guild mark fallback when no icon is set', () => {
    const { container } = render(
      <GuildIcon guildId="42" iconAssetId="0" name="Cordis Studio" size="header" />,
    )
    expect(screen.getByText('CS')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders the public icon image when an asset id is present', () => {
    const { container } = render(
      <GuildIcon guildId="42" iconAssetId="99" name="Cordis Studio" size="header" />,
    )
    const image = container.querySelector('img')
    expect(image).toHaveAttribute(
      'src',
      'http://storage.cordis.localhost:9000/cordis-public/icons/42/99',
    )
  })

  it('falls back to the guild mark when the image fails to load', () => {
    const { container } = render(
      <GuildIcon guildId="42" iconAssetId="99" name="Cordis Studio" size="header" />,
    )
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    fireEvent.error(image!)
    expect(screen.getByText('CS')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
