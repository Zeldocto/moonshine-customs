import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { PageSpinner } from '../components/Loaders'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { updateProfile, uploadAvatar, isUsernameAvailable } from '../lib/profiles'
import { friendlyError } from '../lib/errors'
import { validateUsername } from '../lib/validation'

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const { notify } = useToast()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user || !profile) return <PageSpinner label="Loading your profile" />

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!user || !profile) return
    setError(null)

    const problem = validateUsername(username)
    if (problem) {
      setError(problem)
      return
    }

    setBusy(true)
    try {
      if (
        username.toLowerCase() !== profile.username.toLowerCase() &&
        !(await isUsernameAvailable(username, user.id))
      ) {
        setError('That username is taken.')
        return
      }
      await updateProfile(user.id, { username: username.trim(), bio: bio.trim() || null })
      await refreshProfile()
      notify('Profile saved.', 'success')
    } catch (err) {
      setError(friendlyError(err, 'Those changes did not save.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file || !user) return
    setBusy(true)
    try {
      const url = await uploadAvatar(user.id, file)
      await updateProfile(user.id, { avatar_url: url })
      await refreshProfile()
      notify('Avatar updated.', 'success')
    } catch (err) {
      notify(friendlyError(err, 'That avatar did not upload.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Your profile</h1>
      <p className="mb-6 text-inkSoft">
        Public. Anyone can see this at{' '}
        <Link to={`/profile/${profile.username}`}>/profile/{profile.username}</Link>.
      </p>

      <form className="surface space-y-5 p-6" onSubmit={handleSave} noValidate>
        <div className="flex items-center gap-4">
          <Avatar profile={profile} size={72} />
          <div className="flex-1">
            <label className="label" htmlFor="avatar">
              Avatar
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="field file:mr-3 file:rounded-full file:border-0 file:bg-lagoon file:px-4 file:py-1.5 file:font-display file:font-bold file:text-white"
              onChange={(event) => void handleAvatar(event.target.files?.[0])}
              disabled={busy}
            />
            <p className="hint">PNG, JPEG or WebP, up to 2 MB.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="field"
            value={username}
            maxLength={24}
            onChange={(event) => setUsername(event.target.value)}
          />
          <p className="hint">Changing this changes your profile link.</p>
        </div>

        <div>
          <label className="label" htmlFor="bio">
            About you
          </label>
          <textarea
            id="bio"
            className="field min-h-[110px]"
            value={bio}
            maxLength={500}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Which categories you run, where you stream, anything."
          />
          <p className="hint">{bio.length}/500</p>
        </div>

        {error && (
          <p role="alert" className="notice-error">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <section className="surface mt-6 p-6">
        <h2 className="text-xl">Account</h2>
        <p className="mt-1 text-inkSoft">
          Signed in as {user.email}. Passwords are handled by Supabase Auth — this site never sees
          or stores them.
        </p>
        <Link to="/forgot-password" className="btn-ghost btn-sm mt-4">
          Change password by email
        </Link>
      </section>
    </div>
  )
}
