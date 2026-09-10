import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../lib/errors'
import { validateEmail, validatePassword, validateUsername } from '../lib/validation'
import { isUsernameAvailable } from '../lib/profiles'
import { AuthShell } from '../components/AuthShell'

export default function Register() {
  const { signUp, user } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const problem =
      validateUsername(username) ?? validateEmail(email) ?? validatePassword(password)
    if (problem) {
      setError(problem)
      return
    }

    setBusy(true)
    try {
      if (!(await isUsernameAvailable(username.trim()))) {
        setError('That username is taken. Try another.')
        return
      }
      const { needsConfirmation } = await signUp(email.trim(), password, username.trim())
      if (needsConfirmation) {
        setSent(true)
      } else {
        notify('Welcome in.', 'success')
        navigate('/')
      }
    } catch (err) {
      setError(friendlyError(err, 'That account could not be created.'))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p>
          A confirmation link is on its way to <strong>{email}</strong>. Open it and you are in.
        </p>
        <p className="mt-3 text-sm text-inkSoft">
          Nothing after a few minutes? Check spam, then try signing in — the site can resend it.
        </p>
        <Link to="/login" className="btn-primary mt-6 w-full">
          Go to sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create an account" subtitle="Free, and your email stays private.">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="field"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={24}
            autoComplete="username"
            required
          />
          <p className="hint">3–24 characters. Shows on your skins and at /profile/{username || 'yourname'}.</p>
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
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
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-sm">
        Already have one? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  )
}
