interface BrandMarkProps {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-panel border border-brand/25 bg-brand-soft text-sm font-black text-brand-text shadow-brand">
        C
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight text-ink">Cordis</span>
        {!compact ? (
          <span className="mt-0.5 block text-xs text-subtle">Your communities, in sync.</span>
        ) : null}
      </span>
    </div>
  )
}
