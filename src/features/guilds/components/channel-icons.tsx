export function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-3 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 12 12"
    >
      <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}

export function VoiceChannelIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20">
      <path
        d="M4 8.25h2.25L10 5.25v9.5l-3.75-3H4v-3.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.1a4 4 0 0 1 0 5.8M14.7 5a7 7 0 0 1 0 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export function TextChannelIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20">
      <path
        d="M7.25 3.5 5.75 16.5M14.25 3.5l-1.5 13M3.5 7.25h13M3 12.75h13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

export function DragHandleIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="5" cy="3" r="1" />
      <circle cx="11" cy="3" r="1" />
      <circle cx="5" cy="8" r="1" />
      <circle cx="11" cy="8" r="1" />
      <circle cx="5" cy="13" r="1" />
      <circle cx="11" cy="13" r="1" />
    </svg>
  )
}

export function SettingsGearIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 16 16"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <path
        d="M6.4 1.8h3.2l.4 1.5a4.8 4.8 0 0 1 1.2.7l1.5-.5 1.6 2.8-1.2 1a4.8 4.8 0 0 1 0 1.4l1.2 1-1.6 2.8-1.5-.5a4.8 4.8 0 0 1-1.2.7l-.4 1.5H6.4l-.4-1.5a4.8 4.8 0 0 1-1.2-.7l-1.5.5L1.7 9.7l1.2-1a4.8 4.8 0 0 1 0-1.4l-1.2-1 1.6-2.8 1.5.5a4.8 4.8 0 0 1 1.2-.7l.4-1.5Z"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.7" />
    </svg>
  )
}
