import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SkinGrid } from '../components/SkinGrid'
import { Pagination } from '../components/Pagination'
import { ErrorState } from '../components/Loaders'
import { useAsync } from '../hooks/useAsync'
import { useDebounced } from '../hooks/useDebounced'
import { browseSkins, PAGE_SIZE } from '../lib/skins'
import { SORT_OPTIONS, type SortKey } from '../types/skin'
import { formatCount } from '../utils/format'

export default function Browse() {
  const [params, setParams] = useSearchParams()

  const sort = (params.get('sort') as SortKey) ?? 'top'
  const tag = params.get('tag') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debouncedSearch = useDebounced(search, 350)

  // Keep the URL in step with the search box so results stay shareable.
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debouncedSearch) next.set('q', debouncedSearch)
    else next.delete('q')
    if (next.get('q') !== params.get('q')) {
      next.delete('page')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const query = params.get('q') ?? ''
  const { data, loading, error, reload } = useAsync(
    () => browseSkins({ query, sort, page, tag: tag || undefined }),
    [query, sort, page, tag],
    'Could not load skins.',
  )

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl">Browse skins</h1>
          <p className="text-inkSoft">
            {loading
              ? 'Loading…'
              : `${formatCount(data?.total ?? 0)} skin${data?.total === 1 ? '' : 's'}`}
            {tag && (
              <>
                {' '}tagged <span className="tag">{tag}</span>{' '}
                <button type="button" className="underline" onClick={() => update('tag', null)}>
                  clear
                </button>
              </>
            )}
          </p>
        </div>
        <Link to="/upload" className="btn-shine btn-sm">
          Upload a skin
        </Link>
      </div>

      <div className="surface mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="skin-search">
            Search
          </label>
          <input
            id="skin-search"
            type="search"
            className="field"
            placeholder="Name, creator, description or tag"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <label className="label" htmlFor="skin-sort">
            Sort by
          </label>
          <select
            id="skin-sort"
            className="field"
            value={sort}
            onChange={(event) => update('sort', event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <SkinGrid
            skins={data?.skins ?? []}
            loading={loading}
            skeletonCount={PAGE_SIZE / 2}
            emptyTitle={query ? 'Nothing matched that search' : 'No skins yet'}
            emptyBody={
              query ? (
                'Try a shorter search, or a creator name.'
              ) : (
                <>
                  <Link to="/upload">Upload the first one</Link> and it lands right here.
                </>
              )
            }
          />

          <div className="mt-8">
            <Pagination
              page={data?.page ?? 1}
              pageCount={data?.pageCount ?? 1}
              onChange={(next) => {
                update('page', String(next))
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
