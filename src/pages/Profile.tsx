import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { SkinGrid } from '../components/SkinGrid'
import { EmptyState, ErrorState, PageSpinner } from '../components/Loaders'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../lib/auth'
import { getProfileByUsername } from '../lib/profiles'
import { browseSkins } from '../lib/skins'
import { formatCount, formatDate } from '../utils/format'

export default function Profile() {
  const { username = '' } = useParams()
  const { user } = useAuth()

  const { data: profile, loading, error, reload } = useAsync(
    () => getProfileByUsername(username),
    [username],
  )

  const skins = useAsync(
    async () => (profile ? browseSkins({ authorId: profile.id, sort: 'new', pageSize: 24 }) : null),
    [profile?.id],
  )

  if (loading) return <PageSpinner label="Loading profile" />
  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  if (!profile)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="No such profile">
          Nobody here goes by that name. <Link to="/browse">Browse skins instead</Link>.
        </EmptyState>
      </div>
    )

  const isSelf = user?.id === profile.id
  const totalDownloads = (skins.data?.skins ?? []).reduce((sum, s) => sum + s.download_count, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="surface mb-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <Avatar profile={profile} size={88} />
        <div className="flex-1">
          <h1 className="text-3xl">{profile.username}</h1>
          {profile.bio && <p className="mt-1 max-w-prose whitespace-pre-line">{profile.bio}</p>}
          <p className="mt-1 text-sm text-inkSoft">
            Joined {formatDate(profile.created_at)} · {formatCount(skins.data?.total ?? 0)} skins ·{' '}
            {formatCount(totalDownloads)} downloads
          </p>
        </div>
        {isSelf && (
          <div className="flex gap-2">
            <Link to="/settings" className="btn-ghost btn-sm">
              Edit profile
            </Link>
            <Link to="/upload" className="btn-shine btn-sm">
              Upload
            </Link>
          </div>
        )}
      </header>

      <h2 className="mb-4">Skins by {profile.username}</h2>
      <SkinGrid
        skins={skins.data?.skins ?? []}
        loading={skins.loading}
        emptyTitle={isSelf ? 'You have not uploaded a skin yet' : 'No skins yet'}
        emptyBody={
          isSelf ? (
            <>
              Your Moonshine colours are one file away. <Link to="/upload">Upload a skin</Link>.
            </>
          ) : (
            'Check back later.'
          )
        }
      />
    </div>
  )
}
