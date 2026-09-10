export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3" role="status">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-sandDeep border-t-lagoon" />
      <span className="text-sm text-inkSoft">{label}…</span>
    </div>
  )
}

export function SkinCardSkeleton() {
  return (
    <article className="surface overflow-hidden">
      <div className="h-2 w-full bg-sandDeep" />
      <div className="skeleton m-4 h-40 rounded-chip" />
      <div className="space-y-2 px-4 pb-4">
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-9 w-full rounded-full" />
      </div>
    </article>
  )
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkinCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3>{title}</h3>
      <div className="max-w-md text-inkSoft">{children}</div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface flex flex-col items-center gap-3 border-coral/40 px-6 py-12 text-center">
      <h3>That did not load</h3>
      <p className="max-w-md text-inkSoft">{message}</p>
      {onRetry && (
        <button type="button" className="btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
