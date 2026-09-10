import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { friendlyError } from '../lib/errors'
import { AuthShell } from '../components/AuthShell'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(friendlyError(err, 'That email could not be sent.'))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p>
          If an account exists for <strong>{email}</strong>, a reset link is on the way. The link
          works once and expires after an hour.
        </p>
        <Link to="/login" className="btn-primary mt-6 w-full">
          Back to sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password" subtitle="We will email you a link.">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
        {error && (
          <p role="alert" className="notice-error">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
