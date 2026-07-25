import type { GuildChannelPosition } from '@/api/guild'

import type { GuildChannelSummary } from '@/features/guilds/guild-queries'

const categoryChannelType = 2

export interface GuildChannelMoveTarget {
  overChannelId?: string
  parentId?: string
  placement: 'after' | 'before' | 'end'
}

export function moveGuildChannelInList(
  channels: GuildChannelSummary[],
  channelId: string,
  target: GuildChannelMoveTarget,
): GuildChannelSummary[] {
  const activeChannel = channels.find((channel) => channel.id === channelId)
  if (!activeChannel) return channels

  if (activeChannel.type === categoryChannelType && target.parentId) return channels
  if (
    target.parentId &&
    !channels.some(
      (channel) =>
        channel.id === target.parentId && channel.type === categoryChannelType && !channel.parentId,
    )
  ) {
    return channels
  }

  const sourceParentId = activeChannel.parentId
  const sourceGroup = getOrderedGroup(channels, sourceParentId)
  const destinationGroup =
    sourceParentId === target.parentId ? sourceGroup : getOrderedGroup(channels, target.parentId)
  const destinationWithoutActive = destinationGroup.filter((channel) => channel.id !== channelId)
  let insertionIndex = destinationWithoutActive.length

  if (target.placement !== 'end') {
    const overIndex = destinationWithoutActive.findIndex(
      (channel) => channel.id === target.overChannelId,
    )
    if (overIndex < 0) return channels
    insertionIndex = overIndex + (target.placement === 'after' ? 1 : 0)
  }

  const movedChannel = { ...activeChannel, parentId: target.parentId }
  const nextDestination = [...destinationWithoutActive]
  nextDestination.splice(insertionIndex, 0, movedChannel)

  const updates = new Map<string, GuildChannelSummary>()
  assignGlobalPositions(nextDestination, target.parentId, updates)

  const nextChannels = channels.map((channel) => updates.get(channel.id) ?? channel)
  return hasPlacementChanges(channels, nextChannels) ? nextChannels : channels
}

export function getChangedChannelPositions(
  previous: GuildChannelSummary[],
  next: GuildChannelSummary[],
): GuildChannelPosition[] {
  const previousById = new Map(previous.map((channel) => [channel.id, channel]))
  return next
    .filter((channel) => {
      const prior = previousById.get(channel.id)
      return prior && (prior.position !== channel.position || prior.parentId !== channel.parentId)
    })
    .map((channel) => {
      const prior = previousById.get(channel.id)!
      return {
        channelId: channel.id,
        ...(prior.parentId !== channel.parentId ? { parentId: channel.parentId ?? null } : {}),
        position: channel.position,
      }
    })
}

function getOrderedGroup(channels: GuildChannelSummary[], parentId?: string) {
  return channels
    .filter((channel) => channel.parentId === parentId)
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
}

function assignGlobalPositions(
  channels: GuildChannelSummary[],
  parentId: string | undefined,
  updates: Map<string, GuildChannelSummary>,
) {
  const positions = channels.map((channel) => channel.position).sort((left, right) => left - right)
  channels.forEach((channel, index) => {
    updates.set(channel.id, { ...channel, parentId, position: positions[index]! })
  })
}

function hasPlacementChanges(previous: GuildChannelSummary[], next: GuildChannelSummary[]) {
  return next.some((channel, index) => {
    const prior = previous[index]
    return (
      prior?.id !== channel.id ||
      prior.parentId !== channel.parentId ||
      prior.position !== channel.position
    )
  })
}
