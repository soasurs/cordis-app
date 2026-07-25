import { describe, expect, it } from 'vitest'

import {
  GUILD_ICON_MAX_BYTES,
  guildIconValidationMessage,
  validateGuildIconFile,
} from '@/features/guilds/validation'

describe('validateGuildIconFile', () => {
  it('accepts jpeg, png, and webp within the size limit', () => {
    expect(
      validateGuildIconFile(new File(['x'], 'icon.jpg', { type: 'image/jpeg' })),
    ).toBeUndefined()
    expect(
      validateGuildIconFile(new File(['x'], 'icon.png', { type: 'image/png' })),
    ).toBeUndefined()
    expect(
      validateGuildIconFile(new File(['x'], 'icon.webp', { type: 'image/webp' })),
    ).toBeUndefined()
  })

  it('rejects unsupported content types', () => {
    expect(
      validateGuildIconFile(new File(['x'], 'icon.gif', { type: 'image/gif' })),
    ).toBe(guildIconValidationMessage.contentType)
    expect(validateGuildIconFile(new File(['x'], 'icon.bin', { type: '' }))).toBe(
      guildIconValidationMessage.contentType,
    )
  })

  it('rejects empty and oversized files', () => {
    expect(
      validateGuildIconFile(new File([], 'empty.png', { type: 'image/png' })),
    ).toBe(guildIconValidationMessage.size)

    const oversized = new File([new Uint8Array(GUILD_ICON_MAX_BYTES + 1)], 'big.png', {
      type: 'image/png',
    })
    expect(validateGuildIconFile(oversized)).toBe(guildIconValidationMessage.size)
  })
})
