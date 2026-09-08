import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SkinPreview } from '../components/SkinPreview'
import { SkinGrid } from '../components/SkinGrid'
import { ErrorState } from '../components/Loaders'
import { useAsync } from '../hooks/useAsync'
import { browseSkins, getFeaturedSkins } from '../lib/skins'
import { coerceSkinData } from '../lib/skin-format/parser'
import type { SkinRecord } from '../types/skin'

export default function Home() {
  const featured = useAsync(() => getFeaturedSkins(4), [])
  const top = useAsync(() => browseSkins({ sort: 'top', pageSize: 4 }), [])
  const fresh = useAsync(() => browseSkins({ sort: 'new', pageSize: 4 }), [])
  const downloaded = useAsync(() => browseSkins({ sort: 'downloads', pageSize: 4 }), [])

  // The hero shows a real skin when there is one, and vanilla colours until then.
  const heroSkin = useMemo(() => {
    const candidate: SkinRecord | undefined = featured.data?.[0] ?? top.data?.skins[0]
    return candidate ? candidate.colors : coerceSkinData(null)
  }, [featured.data, top.data])

  const heroLink: SkinRecord | undefined = featured.data?.[0] ?? top.data?.skins[0]

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div>
          <h1 className="text-balance leading-[1.05]">
            Every Mario in the run
            <br />
            looks the same. Fix that.
          </h1>
          <p className="mt-4 max-w-prose text-lg text-inkSoft">
            Moonshine lets you recolour Mario and FLUDD. This is where the community keeps those
            colour sets — upload yours, see it on a model before anyone downloads it, and grab
            someone else&apos;s in one click.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/browse" className="btn-primary">
              Browse skins
            </Link>
            <Link to="/upload" className="btn-shine">
              Upload a skin
            </Link>
          </div>
          {heroLink && (
            <p className="mt-4 text-sm text-inkSoft">
              Showing{' '}
              <Link to={`/skin/${heroLink.id}`} className="font-semibold">
                {heroLink.name}
              </Link>{' '}
              by {heroLink.author_username}. Drag it around.
            </p>
          )}
        </div>

        <div className="surface overflow-hidden p-2">
          <SkinPreview skin={heroSkin} height={380} />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 pb-8">
        {featured.data && featured.data.length > 0 && (
          <Row title="Featured" subtitle="Picked by the moderators" to="/browse">
            <SkinGrid skins={featured.data} skeletonCount={4} />
          </Row>
        )}

        <Row title="Most upvoted" subtitle="What the community rates highest" to="/browse?sort=top">
          {top.error ? (
            <ErrorState message={top.error} onRetry={top.reload} />
          ) : (
            <SkinGrid
              skins={top.data?.skins ?? []}
              loading={top.loading}
              skeletonCount={4}
              emptyTitle="No skins yet"
              emptyBody={
                <>
                  Be the first. <Link to="/upload">Upload a skin</Link> and it shows up here.
                </>
              }
            />
          )}
        </Row>

        <Row title="Recently uploaded" subtitle="Fresh from the mod menu" to="/browse?sort=new">
          <SkinGrid skins={fresh.data?.skins ?? []} loading={fresh.loading} skeletonCount={4} />
        </Row>

        <Row title="Most downloaded" subtitle="The ones people actually run" to="/browse?sort=downloads">
          <SkinGrid skins={downloaded.data?.skins ?? []} loading={downloaded.loading} skeletonCount={4} />
        </Row>
      </div>
    </>
  )
}

function Row({
  title,
  subtitle,
  to,
  children,
}: {
  title: string
  subtitle: string
  to: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2>{title}</h2>
          <p className="text-inkSoft">{subtitle}</p>
        </div>
        <Link to={to} className="font-display font-bold">
          See all
        </Link>
      </div>
      {children}
    </section>
  )
}
