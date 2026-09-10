import { Link, useParams } from 'react-router-dom'
import { SkinPreview } from '../components/SkinPreview'
import { ColorList } from '../components/ColorList'
import { VoteButtons } from '../components/VoteButtons'
import { DownloadButton } from '../components/DownloadButton'
import { SkinGrid } from '../components/SkinGrid'
import { Avatar } from '../components/Avatar'
import { EmptyState, ErrorState, PageSpinner } from '../components/Loaders'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../lib/auth'
import { getSkin, getSkinsByAuthor } from '../lib/skins'
import { formatBytes, formatCount, formatDate } from '../utils/format'

export default function SkinDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { data: skin, loading, error, reload } = useAsync(() => getSkin(id), [id])
  const others = useAsync(
    async () => (skin ? getSkinsByAuthor(skin.user_id, 5) : []),
    [skin?.user_id],
  )

  if (loading) return <PageSpinner label="Loading skin" />
  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  if (!skin)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="That skin is gone">
          It may have been deleted by its creator. <Link to="/browse">Browse the rest</Link>.
        </EmptyState>
      </div>
    )

  const isOwner = user?.id === skin.user_id
  const moreByAuthor = (others.data ?? []).filter((s) => s.id !== skin.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="surface overflow-hidden p-2">
          <SkinPreview skin={skin.colors} height={460} showPartToggles />
          <p className="px-3 py-2 text-center text-sm text-inkSoft">
            Drag to rotate, scroll or pinch to zoom.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-3xl sm:text-4xl">{skin.name}</h1>
            <div className="mt-2 flex items-center gap-2.5">
              <Avatar
                profile={{ username: skin.author_username, avatar_url: skin.author_avatar_url }}
                size={36}
              />
              <span>
                by{' '}
                <Link to={`/profile/${skin.author_username}`} className="font-semibold">
                  {skin.author_username}
                </Link>
              </span>
            </div>
          </div>

          {skin.description && <p className="whitespace-pre-line text-lg">{skin.description}</p>}

          {skin.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {skin.tags.map((tag) => (
                <li key={tag}>
                  <Link to={`/browse?tag=${encodeURIComponent(tag)}`} className="tag">
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="surface flex flex-wrap items-center justify-between gap-4 p-4">
            <VoteButtons skinId={skin.id} ownerId={skin.user_id} score={skin.score} size="lg" />
            <div className="text-right">
              <p className="font-display text-2xl font-bold leading-none">
                {formatCount(skin.download_count)}
              </p>
              <p className="text-sm text-inkSoft">downloads</p>
            </div>
          </div>

          <DownloadButton skin={skin} variant="shine" />

          {isOwner && (
            <Link to={`/skin/${skin.id}/edit`} className="btn-ghost w-full">
              Edit or delete
            </Link>
          )}

          <ColorList skin={skin.colors} />

          <dl className="surface grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
            <Fact label="Uploaded" value={formatDate(skin.created_at)} />
            <Fact label="Last updated" value={formatDate(skin.updated_at)} />
            <Fact label="Moonshine version" value={skin.mod_version ?? 'Not specified'} />
            <Fact label="File size" value={formatBytes(skin.file_size)} />
            <Fact label="Format" value={`v${skin.format_version}`} />
            <Fact label="Upvotes / downvotes" value={`${skin.upvote_count} / ${skin.downvote_count}`} />
          </dl>
        </div>
      </div>

      {moreByAuthor.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4">More by {skin.author_username}</h2>
          <SkinGrid skins={moreByAuthor} />
        </section>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-inkSoft">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
