import * as Avatar from '@radix-ui/react-avatar'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Tooltip from '@radix-ui/react-tooltip'

const spaces = [
  { label: 'Cordis home', shortLabel: 'C', active: true },
  { label: 'Product team', shortLabel: 'PT' },
  { label: 'Design room', shortLabel: 'DR' },
]

const channels = [
  { name: 'welcome' },
  { name: 'general', active: true },
  { name: 'product' },
  { name: 'random' },
]

const members = [
  { name: 'Alex Chen', initials: 'AC', status: 'Building Cordis' },
  { name: 'Maya Lin', initials: 'ML', status: 'Reviewing the layout' },
  { name: 'Jordan Lee', initials: 'JL', status: 'Available' },
]

function SpaceButton({
  label,
  shortLabel,
  active = false,
}: {
  label: string
  shortLabel: string
  active?: boolean
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`group relative grid size-11 place-items-center rounded-2xl border text-xs font-semibold transition-colors ${
            active
              ? 'border-violet-400/40 bg-violet-500 text-white shadow-[0_8px_30px_rgba(124,58,237,0.25)]'
              : 'border-white/8 bg-white/[0.045] text-slate-400 hover:border-white/15 hover:bg-white/10 hover:text-white'
          }`}
        >
          {active ? (
            <span className="absolute -left-[0.95rem] h-6 w-1 rounded-r bg-violet-400" />
          ) : null}
          {shortLabel}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-xl"
        >
          {label}
          <Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function GuildRail() {
  return (
    <nav
      aria-label="Spaces"
      className="flex min-h-0 flex-col items-center gap-3 border-r border-white/[0.06] bg-[#080b12] py-4"
    >
      {spaces.map((space) => (
        <SpaceButton key={space.label} {...space} />
      ))}
      <div className="h-px w-8 bg-white/8" />
      <SpaceButton label="Add a space" shortLabel="+" />
      <div className="mt-auto">
        <SpaceButton label="Settings" shortLabel="S" />
      </div>
    </nav>
  )
}

function ChannelSidebar() {
  return (
    <aside className="hidden min-h-0 border-r border-white/[0.06] bg-[#0c1019] md:flex md:flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            Workspace
          </p>
          <h1 className="mt-1 font-semibold text-white">Cordis Studio</h1>
        </div>
        <button
          type="button"
          aria-label="Workspace menu"
          className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"
        >
          ···
        </button>
      </header>

      <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea.Viewport className="size-full px-3 py-5">
          <div className="mb-3 flex items-center justify-between px-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>Text channels</span>
            <span aria-hidden="true">+</span>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.name}
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  channel.active
                    ? 'bg-white/[0.08] font-medium text-white'
                    : 'text-slate-500 hover:bg-white/[0.045] hover:text-slate-200'
                }`}
              >
                <span className="text-base text-slate-600">#</span>
                {channel.name}
              </button>
            ))}
          </div>

          <div className="mt-8 mb-3 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Direct messages
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/[0.045] hover:text-white"
          >
            <Avatar.Root className="relative grid size-7 place-items-center rounded-full bg-sky-400/15 text-[0.65rem] font-semibold text-sky-200">
              <Avatar.Fallback>ML</Avatar.Fallback>
              <span className="absolute right-0 bottom-0 size-2 rounded-full border-2 border-[#0c1019] bg-emerald-400" />
            </Avatar.Root>
            Maya Lin
          </button>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 p-0.5">
          <ScrollArea.Thumb className="flex-1 rounded-full bg-white/10" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <footer className="m-3 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
        <Avatar.Root className="relative grid size-9 place-items-center rounded-xl bg-violet-500/20 text-xs font-semibold text-violet-200">
          <Avatar.Fallback>YC</Avatar.Fallback>
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[#111621] bg-emerald-400" />
        </Avatar.Root>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">You</p>
          <p className="truncate text-xs text-slate-500">Online</p>
        </div>
        <button
          type="button"
          aria-label="User settings"
          className="text-xs text-slate-500 hover:text-white"
        >
          S
        </button>
      </footer>
    </aside>
  )
}

function Conversation() {
  return (
    <main className="flex min-w-0 flex-col bg-[#10151f]">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 sm:px-6">
        <span className="text-xl text-slate-600">#</span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">general</h2>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            A shared starting point for the Cordis community.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[0.68rem] font-medium text-emerald-300 sm:block">
            Layout preview
          </span>
          <button
            type="button"
            aria-label="Search messages"
            className="grid size-9 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-xs text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            /
          </button>
        </div>
      </header>

      <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea.Viewport className="size-full">
          <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-end px-5 py-8 sm:px-8">
            <section className="mb-10 max-w-2xl">
              <div className="mb-5 grid size-14 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-2xl font-semibold text-violet-200 shadow-[0_16px_50px_rgba(76,29,149,0.18)]">
                #
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/75">
                Channel ready
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                This is where the conversation begins.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                The application shell is in place. Messages, presence, and realtime activity will
                arrive here once the Cordis services are connected.
              </p>
            </section>

            <div className="space-y-6 border-t border-white/[0.06] pt-8">
              <div className="flex gap-4">
                <Avatar.Root className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-xs font-semibold text-sky-200">
                  <Avatar.Fallback>AC</Avatar.Fallback>
                </Avatar.Root>
                <div className="min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-semibold text-slate-100">Alex Chen</p>
                    <span className="text-[0.68rem] text-slate-600">Today at 10:24</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Welcome to the initial Cordis workspace. The layout is ready for real data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 p-0.5">
          <ScrollArea.Thumb className="flex-1 rounded-full bg-white/10" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-2 pl-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
          <span className="text-slate-600">+</span>
          <input
            disabled
            aria-label="Message composer placeholder"
            placeholder="Messaging will be connected next"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-300 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
          />
          <button
            disabled
            type="button"
            className="rounded-xl bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-300/60 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}

function MemberSidebar() {
  return (
    <aside className="hidden min-h-0 border-l border-white/[0.06] bg-[#0c1019] 2xl:flex 2xl:flex-col">
      <header className="flex h-16 shrink-0 items-center border-b border-white/[0.06] px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Members · 3
        </p>
      </header>
      <div className="space-y-5 p-5">
        {members.map((member, index) => (
          <div key={member.name} className="flex items-center gap-3">
            <Avatar.Root className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[0.65rem] font-semibold text-slate-300">
              <Avatar.Fallback>{member.initials}</Avatar.Fallback>
              <span
                className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[#0c1019] ${
                  index === 2 ? 'bg-slate-600' : 'bg-emerald-400'
                }`}
              />
            </Avatar.Root>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">{member.name}</p>
              <p className="truncate text-xs text-slate-600">{member.status}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export function AppShell() {
  return (
    <div className="grid h-svh min-h-[32rem] grid-cols-[4rem_minmax(0,1fr)] overflow-hidden bg-[#080b12] text-slate-100 md:grid-cols-[4.5rem_16rem_minmax(0,1fr)] 2xl:grid-cols-[4.5rem_17rem_minmax(0,1fr)_15rem]">
      <GuildRail />
      <ChannelSidebar />
      <Conversation />
      <MemberSidebar />
    </div>
  )
}
