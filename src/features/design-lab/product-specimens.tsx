import { useState } from 'react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { Select } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import { TextInput } from '../../components/ui/text-input'

type ProductView = 'auth' | 'guild' | 'server' | 'user'

const productViews: Array<{ id: ProductView; label: string }> = [
  { id: 'auth', label: 'Auth' },
  { id: 'guild', label: 'Guild' },
  { id: 'server', label: 'Server settings' },
  { id: 'user', label: 'User profile' },
]

export function ProductSpecimens() {
  const [view, setView] = useState<ProductView>('guild')

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="Product view"
        className="mb-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1"
      >
        {productViews.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            onClick={() => setView(option.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition ${
              view === option.id
                ? 'bg-surface-hover text-ink shadow-sm'
                : 'text-subtle hover:text-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === 'auth' ? <AuthSpecimen /> : null}
      {view === 'guild' ? <GuildSpecimen /> : null}
      {view === 'server' ? <ServerSettingsSpecimen /> : null}
      {view === 'user' ? <UserProfileSpecimen /> : null}
    </div>
  )
}

function AuthSpecimen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <article className="relative grid min-h-[36rem] overflow-hidden rounded-shell border border-line bg-canvas p-4 sm:p-6">
      <div className="design-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute top-[-16rem] left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative m-auto w-full max-w-md rounded-shell border border-line bg-surface p-5 shadow-panel sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-brand/25 bg-brand-soft text-sm font-black text-brand-text">
            C
          </div>
          <div>
            <p className="text-sm font-semibold">Cordis</p>
            <p className="text-xs text-subtle">Your communities, in sync.</p>
          </div>
        </div>

        <div
          className="mb-5 flex border-b border-line"
          role="tablist"
          aria-label="Authentication mode"
        >
          {(['login', 'register'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              onClick={() => setMode(option)}
              className={`relative flex-1 px-3 pb-3 text-sm font-semibold capitalize transition ${
                mode === option ? 'text-ink' : 'text-subtle hover:text-muted'
              }`}
            >
              {option === 'login' ? 'Sign in' : 'Create account'}
              {mode === option ? (
                <span className="absolute right-3 bottom-[-1px] left-3 h-0.5 bg-brand" />
              ) : null}
            </button>
          ))}
        </div>

        <div>
          <h3 className="text-xl font-semibold tracking-[-0.025em]">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {mode === 'login'
              ? 'Sign in to continue to your communities.'
              : 'Start a profile that travels with you across Cordis.'}
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {mode === 'register' ? <TextInput label="Display name" placeholder="Alex Chen" /> : null}
          <TextInput label="Email address" type="email" placeholder="you@example.com" />
          <TextInput label="Password" type="password" placeholder="At least 8 characters" />
          <div className="flex items-center justify-between gap-4">
            <Checkbox label="Remember me" />
            {mode === 'login' ? (
              <button
                type="button"
                className="text-xs font-semibold text-brand-text hover:underline"
              >
                Forgot password?
              </button>
            ) : null}
          </div>
          <Button className="w-full">{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
          <Button className="w-full" variant="secondary">
            Continue with passkey
          </Button>
        </div>
      </div>
    </article>
  )
}

function GuildSpecimen() {
  return (
    <article className="grid min-h-[38rem] grid-cols-[3.5rem_minmax(0,1fr)] overflow-hidden rounded-shell border border-line bg-surface shadow-panel md:grid-cols-[3.5rem_12rem_minmax(0,1fr)] xl:grid-cols-[3.5rem_12rem_minmax(0,1fr)_12rem]">
      <GuildRail />
      <ChannelList />
      <MessageColumn />
      <MemberList />
    </article>
  )
}

function GuildRail() {
  return (
    <nav
      aria-label="Preview guilds"
      className="flex flex-col items-center gap-2 border-r border-line bg-canvas py-3"
    >
      {[
        ['C', true],
        ['UX', false],
        ['G', false],
      ].map(([label, active]) => (
        <button
          key={String(label)}
          type="button"
          aria-label={`${label} guild`}
          className={`relative grid size-9 place-items-center rounded-lg border text-[0.65rem] font-bold transition ${
            active
              ? 'border-brand bg-brand text-white shadow-brand'
              : 'border-line bg-surface text-muted hover:bg-surface-hover'
          }`}
        >
          {active ? <span className="absolute -left-[0.7rem] h-5 w-0.5 bg-brand" /> : null}
          {label}
        </button>
      ))}
      <div className="my-1 h-px w-7 bg-line" />
      <button
        type="button"
        aria-label="Add guild"
        className="grid size-9 place-items-center rounded-lg border border-dashed border-line-strong text-sm text-subtle hover:border-brand hover:text-brand-text"
      >
        +
      </button>
    </nav>
  )
}

function ChannelList() {
  const channels = [
    { name: 'welcome' },
    { name: 'general', active: true, unread: 4 },
    { name: 'design-lab' },
    { name: 'random', unread: 2 },
  ]

  return (
    <aside className="hidden min-w-0 border-r border-line bg-surface-raised md:flex md:flex-col">
      <header className="border-b border-line px-4 py-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
          Community
        </p>
        <p className="mt-1 truncate text-sm font-semibold">Cordis Studio</p>
      </header>
      <div className="min-h-0 flex-1 p-2">
        <div className="mb-2 flex items-center justify-between px-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-subtle">
          <span>Text channels</span>
          <span>+</span>
        </div>
        <div className="grid gap-0.5">
          {channels.map((channel) => (
            <button
              key={channel.name}
              type="button"
              className={`flex items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition ${
                channel.active
                  ? 'bg-brand-soft font-semibold text-brand-text'
                  : 'text-muted hover:bg-surface-hover hover:text-ink'
              }`}
            >
              <span className="text-subtle">#</span>
              <span className="min-w-0 flex-1 truncate">{channel.name}</span>
              {channel.unread ? (
                <span className="grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.58rem] font-bold text-white">
                  {channel.unread}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-6 mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-subtle">
          Voice
        </div>
        <button
          type="button"
          className="w-full rounded-md px-2 py-2 text-left text-xs text-muted hover:bg-surface-hover"
        >
          ◦ Studio room
        </button>
      </div>
      <div className="flex items-center gap-2 border-t border-line bg-canvas/50 p-2">
        <Avatar initials="YC" tone="brand" size="small" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">You</p>
          <p className="truncate text-[0.62rem] text-positive">Online</p>
        </div>
        <span className="text-xs text-subtle">•••</span>
      </div>
    </aside>
  )
}

function MessageColumn() {
  return (
    <section className="flex min-w-0 flex-col bg-surface">
      <header className="flex h-[3.8rem] items-center gap-2 border-b border-line px-4">
        <span className="text-lg text-subtle">#</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">general</p>
          <p className="hidden truncate text-[0.65rem] text-subtle sm:block">
            The shared room for the Cordis community
          </p>
        </div>
        <Badge className="ml-auto hidden sm:inline-flex" dot tone="success">
          12 online
        </Badge>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-hidden px-4 py-5 sm:px-5">
        <div className="mb-3">
          <div className="grid size-10 place-items-center rounded-lg bg-brand-soft font-bold text-brand-text">
            #
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em]">Welcome to #general</h3>
          <p className="mt-1 text-sm text-muted">
            This is where the community conversation begins.
          </p>
        </div>
        <PreviewMessage
          initials="ML"
          author="Maya Lin"
          time="10:24"
          tone="accent"
          content="The new theme feels more like a community space now."
        />
        <PreviewMessage
          initials="AC"
          author="Alex Chen"
          time="10:26"
          tone="brand"
          content="The unread and presence states are much easier to scan too."
        />
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-control border border-line bg-surface-raised p-1.5 pl-3 focus-within:border-brand">
          <span className="text-muted">+</span>
          <input
            aria-label="Guild message preview"
            placeholder="Message #general"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-xs text-ink outline-none placeholder:text-subtle"
          />
          <Button size="small">Send</Button>
        </div>
      </div>
    </section>
  )
}

function MemberList() {
  const members = [
    ['ML', 'Maya Lin', 'Reviewing design', 'accent'],
    ['AC', 'Alex Chen', 'Building Cordis', 'brand'],
    ['JL', 'Jordan Lee', 'Available', 'neutral'],
  ] as const

  return (
    <aside className="hidden border-l border-line bg-surface-raised xl:block">
      <p className="border-b border-line px-4 py-5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-subtle">
        Online · 3
      </p>
      <div className="grid gap-4 p-3">
        {members.map(([initials, name, status, tone]) => (
          <div key={name} className="flex items-center gap-2.5">
            <Avatar initials={initials} tone={tone} size="small" online={name !== 'Jordan Lee'} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{name}</p>
              <p className="truncate text-[0.62rem] text-subtle">{status}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function ServerSettingsSpecimen() {
  return (
    <article className="grid min-h-[38rem] overflow-hidden rounded-shell border border-line bg-surface shadow-panel md:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface-raised p-3 md:block">
        <p className="px-2 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-subtle">
          Cordis Studio
        </p>
        <nav aria-label="Server settings sections" className="grid gap-0.5">
          {['Overview', 'Roles', 'Members', 'Moderation', 'Audit log', 'Integrations'].map(
            (item, index) => (
              <button
                key={item}
                type="button"
                className={`rounded-md px-3 py-2 text-left text-xs font-medium ${
                  index === 0
                    ? 'bg-brand-soft text-brand-text'
                    : 'text-muted hover:bg-surface-hover'
                }`}
              >
                {item}
              </button>
            ),
          )}
        </nav>
        <div className="mt-5 border-t border-line pt-3">
          <button
            type="button"
            className="w-full rounded-md px-3 py-2 text-left text-xs font-medium text-negative hover:bg-negative/10"
          >
            Delete server
          </button>
        </div>
      </aside>

      <section className="min-w-0 overflow-hidden p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">
                Server settings
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em]">Overview</h3>
              <p className="mt-1 text-sm text-muted">
                Manage how your community appears across Cordis.
              </p>
            </div>
            <Badge tone="neutral">Owner</Badge>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[8rem_1fr]">
            <div>
              <div className="grid aspect-square place-items-center rounded-panel border border-dashed border-line-strong bg-surface-raised text-2xl font-bold text-brand-text">
                CS
              </div>
              <Button className="mt-2 w-full" size="small" variant="secondary">
                Change icon
              </Button>
            </div>
            <div className="grid gap-4">
              <TextInput label="Server name" defaultValue="Cordis Studio" />
              <Textarea
                label="Description"
                defaultValue="A community for building thoughtful communication tools."
                hint="Shown on invites and the server profile."
              />
              <Select
                label="Default notification level"
                defaultValue="mentions"
                options={[
                  { label: 'Mentions only', value: 'mentions' },
                  { label: 'Every message', value: 'all' },
                ]}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost">Reset</Button>
            <Button>Save changes</Button>
          </div>
        </div>
      </section>
    </article>
  )
}

function UserProfileSpecimen() {
  const [directMessages, setDirectMessages] = useState(true)

  return (
    <article className="grid min-h-[38rem] gap-4 rounded-shell border border-line bg-canvas p-3 shadow-panel lg:grid-cols-[19rem_minmax(0,1fr)] lg:p-5">
      <section className="overflow-hidden rounded-shell border border-line bg-surface">
        <div className="h-24 bg-[linear-gradient(120deg,var(--cordis-color-brand),var(--cordis-color-accent))]" />
        <div className="px-4 pb-5">
          <div className="-mt-9 flex items-end justify-between">
            <Avatar initials="YC" tone="brand" size="large" online />
            <Button size="small" variant="secondary">
              Edit profile
            </Button>
          </div>
          <h3 className="mt-4 text-lg font-semibold">You Chen</h3>
          <p className="text-sm text-subtle">@youchen</p>
          <Badge className="mt-3" dot tone="success">
            Online
          </Badge>
          <p className="mt-4 text-sm leading-6 text-muted">
            Building calm, expressive places for communities to meet.
          </p>
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-subtle">
              Roles
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="brand">Designer</Badge>
              <Badge tone="neutral">Builder</Badge>
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-subtle">
              Member since
            </p>
            <p className="mt-2 text-xs text-muted">July 2026</p>
          </div>
        </div>
      </section>

      <section className="rounded-shell border border-line bg-surface p-4 sm:p-6">
        <div className="border-b border-line pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">
            User settings
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em]">Profile and privacy</h3>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextInput label="Display name" defaultValue="You Chen" />
          <TextInput label="Username" defaultValue="youchen" />
          <div className="sm:col-span-2">
            <Textarea
              label="About me"
              defaultValue="Building calm, expressive places for communities to meet."
              hint="Visible to members who can view your profile."
            />
          </div>
          <Select
            label="Presence"
            defaultValue="online"
            options={[
              { label: 'Online', value: 'online' },
              { label: 'Idle', value: 'idle' },
              { label: 'Do not disturb', value: 'dnd' },
              { label: 'Invisible', value: 'invisible' },
            ]}
          />
          <div className="flex items-start gap-3 rounded-panel border border-line bg-surface-raised p-4">
            <Switch
              aria-label="Allow direct messages"
              checked={directMessages}
              onCheckedChange={setDirectMessages}
            />
            <div>
              <p className="text-sm font-medium">Allow direct messages</p>
              <p className="mt-1 text-xs leading-5 text-subtle">
                Members in shared servers can message you.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end border-t border-line pt-4">
          <Button>Save profile</Button>
        </div>
      </section>
    </article>
  )
}

function PreviewMessage({
  author,
  content,
  initials,
  time,
  tone,
}: {
  author: string
  content: string
  initials: string
  time: string
  tone: 'accent' | 'brand'
}) {
  return (
    <div className="flex gap-3">
      <Avatar initials={initials} tone={tone} size="medium" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold">{author}</p>
          <span className="text-[0.6rem] text-subtle">{time}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted">{content}</p>
      </div>
    </div>
  )
}

function Avatar({
  initials,
  online = false,
  size,
  tone,
}: {
  initials: string
  online?: boolean
  size: 'small' | 'medium' | 'large'
  tone: 'accent' | 'brand' | 'neutral'
}) {
  const sizeClass = {
    small: 'size-8 text-[0.6rem] rounded-lg',
    medium: 'size-9 text-[0.65rem] rounded-lg',
    large: 'size-16 text-sm rounded-xl border-4 border-surface',
  }[size]
  const toneClass = {
    accent: 'bg-accent-soft text-accent-text',
    brand: 'bg-brand-soft text-brand-text',
    neutral: 'bg-surface-hover text-muted',
  }[tone]

  return (
    <div
      className={`relative grid shrink-0 place-items-center font-bold ${sizeClass} ${toneClass}`}
    >
      {initials}
      {online ? (
        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface bg-positive" />
      ) : null}
    </div>
  )
}
