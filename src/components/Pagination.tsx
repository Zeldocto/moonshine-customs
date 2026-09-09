interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null

  const pages = pageWindow(page, pageCount)

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </button>

      {pages.map((p, index) =>
        p === null ? (
          <span key={`gap${index}`} className="px-1 text-inkSoft">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={
              p === page
                ? 'btn btn-sm bg-ink text-white'
                : 'btn-ghost btn-sm'
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
      >
        Next
      </button>
    </nav>
  )
}

function pageWindow(page: number, pageCount: number): (number | null)[] {
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const output: (number | null)[] = []
  let previous = 0
  for (const p of sorted) {
    if (previous && p - previous > 1) output.push(null)
    output.push(p)
    previous = p
  }
  return output
}
