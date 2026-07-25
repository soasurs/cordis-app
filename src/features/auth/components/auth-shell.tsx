import type { PropsWithChildren } from 'react'

import { BrandMark } from '@/features/auth/components/brand-mark'

export function AuthShell({ children }: PropsWithChildren) {
  return (
    <main className="relative min-h-svh overflow-hidden bg-canvas text-ink">
      <div className="design-grid pointer-events-none absolute inset-0 opacity-65" />
      <div className="pointer-events-none absolute -top-80 left-[20%] size-[44rem] rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-16rem] bottom-[-22rem] size-[38rem] rounded-full bg-accent/8 blur-3xl" />

      <div className="relative mx-auto grid min-h-svh w-full max-w-7xl lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-16">
        <aside className="hidden flex-col justify-between px-12 py-10 lg:flex xl:px-16 xl:py-12">
          <BrandMark />

          <div className="max-w-xl pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text">
              Conversation, connected
            </p>
            <h2 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-[-0.05em] text-balance">
              Where important conversations stay in sync.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted">
              Share ideas, move work forward, and keep communities close in one focused, clear
              space.
            </p>

            <ConversationPreview />
          </div>

          <p className="text-xs text-subtle">A quieter place for communities to stay close.</p>
        </aside>

        <section className="flex min-h-svh items-center px-5 py-8 sm:px-8 lg:px-0 lg:pr-12 xl:pr-16">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <div className="mb-8 lg:hidden">
              <BrandMark compact />
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

function ConversationPreview() {
  return (
    <div
      aria-hidden="true"
      className="mt-12 max-w-lg rounded-shell border border-line bg-surface/75 p-4 shadow-panel backdrop-blur"
    >
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <span className="size-2 rounded-full bg-positive" />
        <span className="text-xs font-semibold text-muted"># welcome</span>
        <span className="ml-auto text-[0.65rem] text-subtle">12 online</span>
      </div>
      <div className="mt-4 grid gap-4">
        <PreviewMessage initials="ML" name="Maya" tone="bg-brand-soft text-brand-text">
          Welcome to Cordis. A new conversation starts here.
        </PreviewMessage>
        <PreviewMessage initials="AC" name="Alex" tone="bg-accent-soft text-accent-text">
          Glad to be here. Let&rsquo;s get started.
        </PreviewMessage>
      </div>
    </div>
  )
}

function PreviewMessage({
  children,
  initials,
  name,
  tone,
}: PropsWithChildren<{ initials: string; name: string; tone: string }>) {
  return (
    <div className="flex gap-3">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-control text-[0.65rem] font-bold ${tone}`}
      >
        {initials}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-xs font-semibold text-ink">{name}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{children}</span>
      </span>
    </div>
  )
}
