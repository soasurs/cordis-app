export function FormAlert({ children }: { children?: string }) {
  if (!children) {
    return null
  }

  return (
    <div
      role="alert"
      className="rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
    >
      {children}
    </div>
  )
}
