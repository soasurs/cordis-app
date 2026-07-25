import { getApiErrorMessage } from '@/api/errors'
import { GuildChannelType } from '@/api/guild'
import { Button } from '@/components/ui/button'
import { TextChannelIcon, VoiceChannelIcon } from '@/features/guilds/components/channel-icons'
import type { GuildChannelSummary } from '@/features/guilds/guild-queries'

export function ChannelWelcome({ channel }: { channel: GuildChannelSummary }) {
  const isVoiceChannel = channel.type === GuildChannelType.VOICE
  return (
    <div className="mt-auto rounded-shell border border-line bg-surface-raised p-6 shadow-panel sm:p-8">
      <span className="grid size-11 place-items-center rounded-panel bg-brand-soft text-xl font-bold text-brand-text">
        {isVoiceChannel ? (
          <VoiceChannelIcon className="size-5" />
        ) : (
          <TextChannelIcon className="size-5" />
        )}
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink">
        Welcome to {isVoiceChannel ? '' : '#'}
        {channel.name}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        {channel.topic || 'This is the beginning of this channel. Message history comes next.'}
      </p>
    </div>
  )
}

export function EmptyGuild() {
  return (
    <div className="m-auto max-w-md text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-line bg-surface-raised text-xl text-subtle">
        #
      </span>
      <h2 className="mt-5 text-lg font-semibold text-ink">No channels yet</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Cordis could not find a channel in this community. Channel management is coming next.
      </p>
    </div>
  )
}

export function ChannelLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="mt-3 rounded-control border border-negative/25 bg-negative/10 p-3">
      <p className="text-xs leading-5 text-negative">
        {getApiErrorMessage(error, 'Unable to load channels. Please try again.')}
      </p>
      <Button className="mt-3" size="small" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

export function ChannelListSkeleton() {
  return (
    <div aria-label="Loading channels" className="mt-3 grid gap-2 px-2">
      <span className="h-3 w-20 animate-pulse rounded bg-line" />
      <span className="h-9 animate-pulse rounded-control bg-surface-hover" />
      <span className="h-9 animate-pulse rounded-control bg-surface-hover" />
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="m-auto flex items-center gap-3 text-sm font-medium text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-brand border-r-transparent" />
      Preparing your community
    </div>
  )
}
