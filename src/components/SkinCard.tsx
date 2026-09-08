import { Link } from 'react-router-dom'
import { SkinPreview } from './SkinPreview'
import { PaletteStrip } from './ColorList'
import { VoteButtons } from './VoteButtons'
import { DownloadButton } from './DownloadButton'
import { formatCount, formatRelative } from '../utils/format'
import type { SkinRecord } from '../types/skin'

export function SkinCard({ skin }: { skin: SkinRecord }) {
  return (
    <article className="surface flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <PaletteStrip skin={skin.colors} />

      <Link to={`/skin/${skin.id}`} className="block px-4 pt-4 no-underline">
        <SkinPreview
          skin={skin.colors}
          flat
          className="mx-auto flex h-40 w-full items-center justify-center rounded-chip bg-gradient-to-b from-[#E4F4F5] to-[#F8EDD6] p-2"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="leading-tight">
            <Link to={`/skin/${skin.id}`} className="text-ink no-underline hover:underline">
              {skin.name}
            </Link>
          </h3>
          <p className="text-sm text-inkSoft">
            by{' '}
            <Link to={`/profile/${skin.author_username}`} className="font-medium">
              {skin.author_username}
            </Link>{' '}
            · {formatRelative(skin.created_at)}
          </p>
        </div>

        {skin.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {skin.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <Link to={`/browse?tag=${encodeURIComponent(tag)}`} className="tag">
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <VoteButtons skinId={skin.id} ownerId={skin.user_id} score={skin.score} />
          <span className="text-sm text-inkSoft">{formatCount(skin.download_count)} downloads</span>
        </div>

        <div className="flex gap-2">
          <Link to={`/skin/${skin.id}`} className="btn-ghost btn-sm flex-1">
            View skin
          </Link>
          <div className="flex-1">
            <DownloadButton skin={skin} variant="shine" />
          </div>
        </div>
      </div>
    </article>
  )
}
