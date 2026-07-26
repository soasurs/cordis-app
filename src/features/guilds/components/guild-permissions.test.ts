import { describe, expect, it } from 'vitest'

import { guildPermission, type GuildRole } from '@/api/guild'
import {
  combineGuildRolePermissions,
  memberHasGuildPermission,
  resolveHeldGuildRoles,
} from '@/features/guilds/components/guild-permissions'

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

describe('resolveHeldGuildRoles', () => {
  it('always includes the default role and merges assigned roles', () => {
    expect(resolveHeldGuildRoles([everyone, moderators], [])).toEqual([everyone])
    expect(resolveHeldGuildRoles([everyone, moderators], [moderators])).toEqual([
      everyone,
      moderators,
    ])
  })
})

describe('combineGuildRolePermissions', () => {
  it('ORs permission masks from every held role', () => {
    expect(combineGuildRolePermissions([everyone, moderators])).toBe('160')
  })
})

describe('memberHasGuildPermission', () => {
  it('grants Manage Channels from the flag or Administrator', () => {
    expect(memberHasGuildPermission('32', guildPermission.manageChannels)).toBe(false)
    expect(memberHasGuildPermission('160', guildPermission.manageChannels)).toBe(true)
    expect(memberHasGuildPermission('1', guildPermission.manageChannels)).toBe(true)
  })

  it('grants every permission to the guild owner', () => {
    expect(
      memberHasGuildPermission('0', guildPermission.manageChannels, { isOwner: true }),
    ).toBe(true)
    expect(memberHasGuildPermission('0', guildPermission.manageGuild, { isOwner: true })).toBe(
      true,
    )
  })
})
