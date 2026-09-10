import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../lib/errors'
import { validatePassword } from '../lib/validation'
import { AuthShell } from '../components/AuthShell'

/**
 * Reached from the emailed link. Supabase turns the URL fragment into a
 * recovery session, so `user` is populated by the time this renders.
 */
export default function ResetPassword() {
  const { updatePassword, user, loading } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  useEffect(() => {
    if (!loading && !user) setLinkExpired(true)
  }, [loading, user])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validatePassword(password)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
      notify('Password updated.', 'success')
      navigate('/')
    } catch (err) {
      setError(friendlyError(err, 'That password could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  if (linkExpired) {
    return (
      <AuthShell title="That link has expired">
        <p>Reset links work once and last an hour. Request a fresh one.</p>
        <a href="forgot-password" className="btn-primary mt-6 w-full">
          Send a new link
        </a>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Pick a new password">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="label" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            className="field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <p className="hint">At least 8 characters, with a number.</p>
        </div>
        {error && (
          <p role="alert" className="notice-error">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthShell>
  )
}
