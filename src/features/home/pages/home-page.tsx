import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { GatewayStatus } from '@/app/gateway-context'
import { useCreateGuildDialog } from '@/stores/create-guild-dialog'
import { useJoinGuildInviteDialog } from '@/stores/join-guild-invite-dialog'

interface HomePageProps {
  displayName: string
  gatewayStatus?: GatewayStatus
}

const startingPoints: Array<{
  action?: 'create-community' | 'join-invite'
  copy: string
  mark: string
  title: string
}> = [
  {
    action: 'create-community',
    mark: '+',
    title: 'Create a community',
    copy: 'Start a focused space for your team, group, or community.',
  },
  {
    action: 'join-invite',
    mark: '↗',
    title: 'Join with an invite',
    copy: 'Use an invite code to enter a community you already know.',
  },
  {
    mark: '@',
    title: 'Find a friend',
    copy: 'Search by username and begin a private conversation.',
  },
]

function getFirstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || 'there'
}

export function HomePage({
  displayName,
  gatewayStatus = { errorCode: null, state: 'idle' },
}: HomePageProps) {
  const realtimeStatus = getRealtimeStatus(gatewayStatus)
  const openCreateGuildDialog = useCreateGuildDialog((state) => state.open)
  const openJoinGuildInviteDialog = useJoinGuildInviteDialog((state) => state.open)

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-canvas">
      <header className="hidden h-16 shrink-0 items-center gap-4 border-b border-line bg-surface/85 px-6 backdrop-blur md:flex">
        <div>
          <h2 className="text-sm font-semibold text-ink">Home</h2>
          <p className="mt-0.5 text-xs text-subtle">
            Your conversations and communities at a glance
          </p>
        </div>
        <Badge className="ml-auto" dot tone={realtimeStatus.tone}>
          {realtimeStatus.label}
        </Badge>
        <button
          type="button"
          disabled
          className="flex h-9 w-full max-w-64 items-center gap-2 rounded-control border border-line bg-surface-raised px-3 text-left text-xs text-subtle disabled:cursor-not-allowed"
        >
          <span aria-hidden="true">⌕</span>
          Search Cordis
          <span className="ml-auto rounded border border-line px-1.5 py-0.5 text-[0.6rem]">/</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-7 sm:px-7 sm:py-9 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 space-y-8">
            <section>
              <Badge tone="brand">Cordis Home</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
                Welcome, {getFirstName(displayName)}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                This is your personal starting point. Recent conversations, mentions, and requests
                will collect here as your Cordis grows.
              </p>
            </section>

            <section aria-labelledby="start-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">
                    First steps
                  </p>
                  <h2 id="start-heading" className="mt-2 text-lg font-semibold text-ink">
                    Start connecting
                  </h2>
                </div>
                <Badge>Structure preview</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {startingPoints.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-panel border border-line bg-surface p-4 shadow-panel"
                  >
                    <span className="grid size-9 place-items-center rounded-control bg-brand-soft text-base font-bold text-brand-text">
                      {item.mark}
                    </span>
                    <h3 className="mt-5 text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted">{item.copy}</p>
                    <Button
                      className="mt-5 w-full"
                      disabled={!item.action}
                      size="small"
                      variant="secondary"
                      onClick={
                        item.action === 'create-community'
                          ? openCreateGuildDialog
                          : item.action === 'join-invite'
                            ? () => openJoinGuildInviteDialog()
                            : undefined
                      }
                    >
                      {item.action === 'create-community'
                        ? 'Create community'
                        : item.action === 'join-invite'
                          ? 'Enter invite code'
                          : 'Coming next'}
                    </Button>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="recent-heading">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  Conversations
                </p>
                <h2 id="recent-heading" className="mt-2 text-lg font-semibold text-ink">
                  Continue where you left off
                </h2>
              </div>
              <EmptyPanel
                className="mt-4"
                mark="◌"
                title="No recent conversations"
                copy="Once you join a community or message a friend, your latest conversations will be waiting here."
              />
            </section>
          </div>

          <aside className="space-y-4 xl:pt-1" aria-label="Home details">
            <section className="rounded-panel border border-line bg-surface p-4 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">Needs your attention</h2>
                <Badge tone="success">All clear</Badge>
              </div>
              <p className="mt-5 text-xs leading-5 text-muted">
                Friend requests, mentions, and replies that need action will appear here.
              </p>
            </section>

            <section className="rounded-panel border border-line bg-surface p-4 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">Realtime connection</h2>
                <Badge dot tone={realtimeStatus.tone}>
                  {realtimeStatus.label}
                </Badge>
              </div>
              <div className="mt-5 rounded-control bg-surface-raised px-3 py-4">
                <p className="text-xs leading-5 text-muted">{realtimeStatus.copy}</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

function getRealtimeStatus(status: GatewayStatus): {
  copy: string
  label: string
  tone: 'danger' | 'neutral' | 'success' | 'warning'
} {
  if (status.errorCode === 'configuration_error') {
    return {
      copy: 'Realtime is unavailable. Check the VITE_GATEWAY_URL configuration.',
      label: 'Unavailable',
      tone: 'danger',
    }
  }

  switch (status.state) {
    case 'connecting':
      return {
        copy: 'Opening a secure realtime connection to Cordis.',
        label: 'Connecting',
        tone: 'warning',
      }
    case 'reconnecting':
      return {
        copy: 'The connection was interrupted. Cordis is retrying automatically.',
        label: 'Reconnecting',
        tone: 'warning',
      }
    case 'ready':
      return {
        copy: 'Live updates are connected and ready to receive events.',
        label: 'Connected',
        tone: 'success',
      }
    case 'idle':
      return {
        copy: status.errorCode
          ? 'Realtime is temporarily offline. Cordis will reconnect when possible.'
          : 'Realtime updates are currently offline.',
        label: 'Offline',
        tone: 'neutral',
      }
  }
}

function EmptyPanel({
  className = '',
  copy,
  mark,
  title,
}: {
  className?: string
  copy: string
  mark: string
  title: string
}) {
  return (
    <div
      className={`flex min-h-44 flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface/55 px-6 py-8 text-center ${className}`}
    >
      <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-lg text-subtle">
        {mark}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-muted">{copy}</p>
    </div>
  )
}
