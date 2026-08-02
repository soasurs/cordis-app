import { TextChannelIcon } from '@/features/guilds/components/channel-icons'
import type { GuildChannelSummary } from '@/features/guilds/guild-queries'
import { ChannelMessageView } from '@/features/messages/components/channel-message-view'

interface TextChannelViewProps {
  canManageMessages: boolean
  canMentionRolesAndEveryone: boolean
  canSend: boolean
  channel: GuildChannelSummary
}

export function TextChannelView({
  canManageMessages,
  canMentionRolesAndEveryone,
  canSend,
  channel,
}: TextChannelViewProps) {
  return (
    <ChannelMessageView
      canManageMessages={canManageMessages}
      canMentionRolesAndEveryone={canMentionRolesAndEveryone}
      canSend={canSend}
      channelId={channel.id}
      channelName={channel.name}
      guildId={channel.guildId}
      historyStart={<ChannelHistoryStart channel={channel} />}
      messageListLabel={`#${channel.name}`}
    />
  )
}

function ChannelHistoryStart({ channel }: { channel: GuildChannelSummary }) {
  return (
    <div>
      <span className="grid size-11 place-items-center rounded-panel bg-brand-soft text-xl font-bold text-brand-text">
        <TextChannelIcon className="size-5" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink">
        Welcome to #{channel.name}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        {channel.topic || 'This is the beginning of this channel.'}
      </p>
    </div>
  )
}
