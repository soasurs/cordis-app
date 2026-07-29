import { describe, expect, it } from 'vitest'

import { type GuildRole } from '@/api/guild'
import {
  canAccessGuildSettingsSection,
  canGuildCapability,
  resolveEffectiveGuildPermissions,
} from '@/features/guilds/guild-capabilities'

const everyone: GuildRole = {
  createdAt: 1,
  guildId: '42',
  id: '42',
  isDefault: true,
  name: '@everyone',
  permissions: '32',
  position: 0,
  revision: 1,
  updatedAt: 1,
}

const moderators: GuildRole = {
  createdAt: 1,
  guildId: '42',
  id: '50',
  isDefault: false,
  name: 'Moderators',
  permissions: '128',
  position: 1,
  revision: 1,
  updatedAt: 1,
}

describe('resolveEffectiveGuildPermissions', () => {
  it('ORs held role masks and records ownership', () => {
    expect(
      resolveEffectiveGuildPermissions({
        assignedRoles: [moderators],
        guildRoles: [everyone, moderators],
        isOwner: false,
      }),
    ).toEqual({ isOwner: false, permissions: '160' })
  })
})

describe('canGuildCapability', () => {
  it('grants every capability to the owner', () => {
    const owner = { isOwner: true, permissions: '0' }
    expect(canGuildCapability(owner, 'manageChannels')).toBe(true)
    expect(canGuildCapability(owner, 'openGuildSettings')).toBe(true)
  })

  it('maps manageChannels to the permission bit or Administrator', () => {
    expect(canGuildCapability({ isOwner: false, permissions: '32' }, 'manageChannels')).toBe(false)
    expect(canGuildCapability({ isOwner: false, permissions: '160' }, 'manageChannels')).toBe(true)
    expect(canGuildCapability({ isOwner: false, permissions: '1' }, 'manageChannels')).toBe(true)
  })

  it('opens settings for Manage community or other settings-section permissions', () => {
    expect(canGuildCapability({ isOwner: false, permissions: '2' }, 'openGuildSettings')).toBe(true)
    expect(canGuildCapability({ isOwner: false, permissions: '4' }, 'openGuildSettings')).toBe(true)
    expect(canGuildCapability({ isOwner: false, permissions: '1024' }, 'openGuildSettings')).toBe(
      true,
    )
    expect(canGuildCapability({ isOwner: false, permissions: '32' }, 'openGuildSettings')).toBe(
      false,
    )
  })

  it('gates settings sections by their specific permissions', () => {
    const manageGuildOnly = { isOwner: false, permissions: '2' }
    expect(canAccessGuildSettingsSection(manageGuildOnly, 'overview')).toBe(true)
    expect(canAccessGuildSettingsSection(manageGuildOnly, 'roles')).toBe(false)
    expect(canAccessGuildSettingsSection(manageGuildOnly, 'members')).toBe(false)
    expect(canAccessGuildSettingsSection(manageGuildOnly, 'invites')).toBe(false)

    const manageRolesOnly = { isOwner: false, permissions: '4' }
    expect(canAccessGuildSettingsSection(manageRolesOnly, 'roles')).toBe(true)
    expect(canAccessGuildSettingsSection(manageRolesOnly, 'overview')).toBe(false)
  })
})
