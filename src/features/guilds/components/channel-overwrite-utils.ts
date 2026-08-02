import type { GuildChannelPermissionOverwrite } from '@/api/guild'

export function channelOverwriteKey(
  overwrite: Pick<GuildChannelPermissionOverwrite, 'appliesTo' | 'appliesToId'>,
) {
  return `${overwrite.appliesTo}:${overwrite.appliesToId}`
}
