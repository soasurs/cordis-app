import { useEffect, useState, type FormEvent } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { TextInput } from '@/components/ui/text-input'
import { ProductSpecimens } from '@/features/design-lab/product-specimens'

type Theme = 'light' | 'dark'
type ThemePreference = Theme | 'system'
type Palette = 'current' | 'morandi' | 'pulse'

const colorRoles = [
  {
    name: 'Canvas',
    className: 'bg-canvas',
    current: { light: '#F5F6F8', dark: '#080B12' },
    morandi: { light: '#F2F1ED', dark: '#181918' },
    pulse: { light: '#F7F5FA', dark: '#121015' },
  },
  {
    name: 'Surface',
    className: 'bg-surface-raised',
    current: { light: '#FAFBFC', dark: '#121824' },
    morandi: { light: '#F6F4EF', dark: '#252625' },
    pulse: { light: '#F2EEF6', dark: '#211D26' },
  },
  {
    name: 'Brand',
    className: 'bg-brand',
    current: { light: '#6738DC', dark: '#7C3AED' },
    morandi: { light: '#665672', dark: '#76677F' },
    pulse: { light: '#7546C8', dark: '#7546C8' },
  },
  {
    name: 'Accent',
    className: 'bg-accent',
    current: { light: '#D86486', dark: '#F07C9E' },
    morandi: { light: '#B36F68', dark: '#C98B82' },
    pulse: { light: '#D65F72', dark: '#E97688' },
  },
  {
    name: 'Positive',
    className: 'bg-positive',
    current: { light: '#087F5B', dark: '#34D399' },
    morandi: { light: '#52705F', dark: '#96AE9C' },
    pulse: { light: '#20785F', dark: '#4BC19B' },
  },
  {
    name: 'Negative',
    className: 'bg-negative',
    current: { light: '#C93652', dark: '#FB7185' },
    morandi: { light: '#985B63', dark: '#C48E93' },
    pulse: { light: '#B83D55', dark: '#EC7388' },
  },
]

const initialMessages = [
  {
    author: 'Maya Lin',
    initials: 'ML',
    tone: 'bg-surface-hover text-muted',
    time: '10:24',
    content: 'The quieter surfaces make the conversation feel like the main event.',
  },
  {
    author: 'Alex Chen',
    initials: 'AC',
    tone: 'bg-accent-soft text-accent-text',
    time: '10:26',
    content: 'Agreed. Purple works best as a signal, not as decoration everywhere.',
  },
]

export function DesignLab() {
  const [palette, setPalette] = useState<Palette>('current')
  const [themePreference, setThemePreference] = useState<ThemePreference>('light')
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [draft, setDraft] = useState('')
  const [muted, setMuted] = useState(false)
  const [readReceipts, setReadReceipts] = useState(true)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const theme = themePreference === 'system' ? systemTheme : themePreference

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) {
      return
    }
    const updateSystemTheme = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', updateSystemTheme)
    return () => media.removeEventListener('change', updateSystemTheme)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const previousTheme = root.dataset.theme
    const previousPalette = root.dataset.palette
    root.dataset.theme = theme
    root.dataset.palette = palette
    return () => {
      if (previousTheme) {
        root.dataset.theme = previousTheme
      } else {
        delete root.dataset.theme
      }
      if (previousPalette) {
        root.dataset.palette = previousPalette
      } else {
        delete root.dataset.palette
      }
    }
  }, [palette, theme])

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) {
      return
    }
    setSentMessage(content)
    setDraft('')
  }

  return (
    <main
      data-palette={palette}
      data-theme={theme}
      className="relative min-h-svh overflow-hidden bg-canvas text-ink"
    >
      <div className="design-grid pointer-events-none absolute inset-0 h-[46rem] opacity-70" />
      <div className="pointer-events-none absolute top-[-18rem] left-1/2 size-[48rem] -translate-x-1/2 rounded-full bg-brand/8 blur-3xl" />

      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[92rem] items-center gap-4 px-5 sm:px-8">
          <div className="grid size-9 place-items-center rounded-xl border border-brand/30 bg-brand-soft text-sm font-black text-brand-text shadow-brand">
            C
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-tight">Cordis Design Lab</p>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-subtle">
              Review 01 · Visual foundation
            </p>
          </div>
          <div
            role="group"
            aria-label="Preview theme"
            className="ml-auto flex rounded-control border border-line bg-surface/80 p-1 shadow-sm"
          >
            {(['light', 'dark', 'system'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={themePreference === option}
                onClick={() => setThemePreference(option)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition sm:px-3 ${
                  themePreference === option
                    ? 'bg-surface-hover text-ink shadow-sm'
                    : 'text-subtle hover:text-muted'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-[92rem] gap-8 px-5 py-9 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-12">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-7">
            <div>
              <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-subtle">
                Direction
              </p>
              <p className="text-sm font-semibold text-ink">{getDirectionName(palette, theme)}</p>
              <p className="mt-2 text-xs leading-5 text-subtle">
                Crisp structure, precise hierarchy, restrained color.
              </p>
            </div>
            <nav aria-label="Design review sections" className="grid gap-1 text-sm">
              {['Principles', 'Foundation', 'Controls', 'Product views', 'In context'].map(
                (item, index) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(' ', '-')}`}
                    className={`rounded-md px-3 py-2 transition hover:bg-surface-hover hover:text-ink ${index === 0 ? 'bg-surface-raised text-ink' : 'text-subtle'}`}
                  >
                    {item}
                  </a>
                ),
              )}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-14 lg:space-y-20">
          <section id="principles" className="scroll-mt-28">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text">
                Proposed direction
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.04]">
                Calm by default.
                <span className="block text-muted">Alive when it matters.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                Cordis should feel focused during long conversations. Color signals action, status,
                and change—never noise.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['01', 'Content first', 'Conversation holds the highest contrast.'],
                ['02', 'Crisp structure', 'Borders define layers; radius stays functional.'],
                ['03', 'Purposeful color', 'Violet marks intent; status colors keep meaning.'],
              ].map(([number, title, copy]) => (
                <article
                  key={number}
                  className="rounded-panel border border-line bg-surface/75 p-4 backdrop-blur"
                >
                  <p className="text-xs font-bold text-brand-text">{number}</p>
                  <h2 className="mt-6 text-sm font-semibold">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-subtle">{copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="foundation" className="scroll-mt-28">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="Foundation"
                title="A restrained, semantic palette"
                copy="Surfaces stay neutral so meaning-bearing colors remain easy to recognize."
              />
              <div
                role="group"
                aria-label="Palette direction"
                className="flex w-fit rounded-control border border-line bg-surface p-1"
              >
                {(['current', 'morandi', 'pulse'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={palette === option}
                    onClick={() => setPalette(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      palette === option
                        ? 'bg-surface-hover text-ink shadow-sm'
                        : 'text-subtle hover:text-muted'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-shell border border-line bg-surface/80 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  Core color roles
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  {colorRoles.map((color) => (
                    <div key={color.name}>
                      <div className={`h-24 rounded-panel border border-line ${color.className}`} />
                      <p className="mt-3 text-xs font-semibold text-muted">{color.name}</p>
                      <p className="mt-1 font-mono text-[0.65rem] text-subtle">
                        {color[palette][theme]}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-shell border border-line bg-surface/80 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  Type hierarchy
                </p>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.035em]">Conversation</p>
                    <p className="mt-1 text-xs text-subtle">Display · 30 / 36 · Semibold</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold">general</p>
                    <p className="mt-1 text-xs text-subtle">Heading · 16 / 24 · Semibold</p>
                  </div>
                  <div>
                    <p className="text-sm leading-6 text-muted">
                      Clear enough to scan, relaxed enough to read for hours.
                    </p>
                    <p className="mt-1 text-xs text-subtle">Body · 14 / 24 · Regular</p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section id="controls" className="scroll-mt-28">
            <SectionHeading
              eyebrow="Controls"
              title="Small set, complete states"
              copy="The first primitives cover the authentication and messaging paths without becoming a component catalogue."
            />

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <article className="rounded-shell border border-line bg-surface/80 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  Button hierarchy
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <Button>Continue</Button>
                  <Button variant="secondary">Preview</Button>
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="danger">Remove</Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <Button loading>Sending</Button>
                  <Button disabled variant="secondary">
                    Unavailable
                  </Button>
                  <Button size="small" variant="secondary">
                    Compact
                  </Button>
                </div>
              </article>

              <article className="rounded-shell border border-line bg-surface/80 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  Input states
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    hint="Used to sign in to Cordis."
                  />
                  <TextInput
                    label="Invite code"
                    defaultValue="CORDIS-08"
                    error="This invite has already been used."
                  />
                </div>
              </article>

              <article className="rounded-shell border border-line bg-surface/80 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  Long form and selection
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Textarea
                    label="Status message"
                    placeholder="What are you working on?"
                    hint="Up to 120 characters."
                    defaultValue="Reviewing the new visual foundation."
                  />
                  <Select
                    label="Notification level"
                    defaultValue="mentions"
                    hint="Applies to this channel only."
                    options={[
                      { label: 'Every message', value: 'all' },
                      { label: 'Mentions only', value: 'mentions' },
                      { label: 'Nothing', value: 'none' },
                    ]}
                  />
                </div>
              </article>

              <article className="rounded-shell border border-line bg-surface/80 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  Choice and feedback
                </p>
                <div className="mt-5 grid gap-4">
                  <Checkbox
                    checked={muted}
                    onChange={(event) => setMuted(event.target.checked)}
                    label="Mute notifications"
                    description="You will still see mention counts in the sidebar."
                  />
                  <div className="flex items-start gap-3 border-t border-line pt-4">
                    <Switch
                      aria-label="Show read receipts"
                      checked={readReceipts}
                      onCheckedChange={setReadReceipts}
                    />
                    <div>
                      <p className="text-sm font-medium">Show read receipts</p>
                      <p className="mt-1 text-xs leading-5 text-subtle">
                        Let other members know when you have read a message.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                    <Badge dot tone="success">
                      Live
                    </Badge>
                    <Badge tone="brand">Draft</Badge>
                    <Badge tone="neutral">Muted</Badge>
                    <Badge tone="warning">Attention</Badge>
                    <Badge tone="danger">Failed</Badge>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section id="product-views" className="scroll-mt-28">
            <SectionHeading
              eyebrow="Product views"
              title="Test the system in real product surfaces"
              copy="The same tokens and primitives now compose authentication, guild navigation, settings, and identity surfaces."
            />
            <ProductSpecimens />
          </section>

          <section id="in-context" className="scroll-mt-28 pb-12">
            <SectionHeading
              eyebrow="In context"
              title="Judge the system inside a conversation"
              copy="Switch the density, type a message, and decide whether the hierarchy still feels natural."
            />

            <article className="mt-6 overflow-hidden rounded-shell border border-line bg-surface shadow-panel">
              <header className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3 sm:px-6">
                <div>
                  <p className="text-sm font-semibold"># design-review</p>
                  <p className="mt-0.5 text-xs text-subtle">3 members · live preview</p>
                </div>
                <div className="ml-auto flex rounded-control border border-line bg-canvas/60 p-1">
                  {(['comfortable', 'compact'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={density === option}
                      onClick={() => setDensity(option)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        density === option
                          ? 'bg-surface-hover text-ink'
                          : 'text-subtle hover:text-muted'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </header>

              <div
                className={`mx-auto max-w-4xl px-4 sm:px-7 ${density === 'compact' ? 'py-4' : 'py-7'}`}
              >
                <div className={density === 'compact' ? 'space-y-3' : 'space-y-6'}>
                  {initialMessages.map((message) => (
                    <Message key={message.author} {...message} compact={density === 'compact'} />
                  ))}
                  {sentMessage ? (
                    <Message
                      author="You"
                      initials="YC"
                      tone="bg-positive/12 text-positive"
                      time="Now"
                      content={sentMessage}
                      compact={density === 'compact'}
                    />
                  ) : null}
                </div>

                <form onSubmit={sendMessage} className="mt-6 flex gap-2 border-t border-line pt-4">
                  <label htmlFor="design-message" className="sr-only">
                    Preview message
                  </label>
                  <input
                    id="design-message"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Message #design-review"
                    className="min-h-10 min-w-0 flex-1 rounded-control border border-line bg-canvas/70 px-3 text-sm text-ink outline-none transition placeholder:text-subtle hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15"
                  />
                  <Button type="submit" disabled={!draft.trim()}>
                    Send
                  </Button>
                </form>
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  )
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string
  title: string
  copy: string
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{copy}</p>
    </div>
  )
}

function Message({
  author,
  compact,
  content,
  initials,
  time,
  tone,
}: {
  author: string
  compact: boolean
  content: string
  initials: string
  time: string
  tone: string
}) {
  return (
    <div className={`flex gap-3 ${compact ? 'items-center' : 'items-start'}`}>
      <div
        className={`grid shrink-0 place-items-center rounded-xl text-[0.65rem] font-bold ${tone} ${compact ? 'size-8' : 'size-10'}`}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold">{author}</p>
          <span className="text-[0.65rem] text-subtle">{time}</span>
        </div>
        <p className={`${compact ? 'mt-0.5' : 'mt-1.5'} text-sm leading-6 text-muted`}>{content}</p>
      </div>
    </div>
  )
}

function getSystemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getDirectionName(palette: Palette, theme: Theme): string {
  if (palette === 'pulse') {
    return theme === 'light' ? 'Pulse daylight' : 'Pulse after dark'
  }
  if (palette === 'morandi') {
    return theme === 'light' ? 'Morandi daylight' : 'Morandi charcoal'
  }
  return theme === 'light' ? 'Soft daylight' : 'Obsidian violet'
}
