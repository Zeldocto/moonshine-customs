import { Link } from 'react-router-dom'
import { SkinGrid } from '../components/SkinGrid'
import { useAsync } from '../hooks/useAsync'
import { browseSkins, getCommunityStats } from '../lib/skins'
import { formatCount } from '../utils/format'

export default function Community() {
  const stats = useAsync(() => getCommunityStats(), [])
  const recent = useAsync(() => browseSkins({ sort: 'new', pageSize: 8 }), [])

  const figures = [
    { label: 'skins published', value: stats.data?.skinCount },
    { label: 'creators', value: stats.data?.creatorCount },
    { label: 'downloads', value: stats.data?.downloadTotal },
    { label: 'votes cast', value: stats.data?.voteTotal },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Community</h1>
      <p className="mb-8 max-w-prose text-inkSoft">
        Everything here was made by people practicing Sunshine. Upload what you run with.
      </p>

      <dl className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="surface p-5">
            <dd className="font-display text-3xl font-extrabold text-accent">
              {stats.loading ? '—' : formatCount(figure.value ?? 0)}
            </dd>
            <dt className="text-sm text-inkSoft">{figure.label}</dt>
          </div>
        ))}
      </dl>

      <section className="mb-12">
        <h2 className="mb-4">Latest uploads</h2>
        <SkinGrid skins={recent.data?.skins ?? []} loading={recent.loading} />
      </section>

      <section className="surface p-6">
        <h2 className="text-xl">Ground rules</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-inkSoft">
          <li>Upload skins you made, or credit whoever did in the description.</li>
          <li>Keep names, descriptions and tags civil, moderators can remove anything that is not.</li>
          <li>Vote on what you actually think of a skin, not who made it.</li>
          <li>
            Found something that breaks these? Say so in the community Discord and a moderator will
            take a look.
          </li>
        </ul>
        <Link to="/upload" className="btn-shine mt-5">
          Upload a skin
        </Link>
      </section>
    </div>
  )
}
