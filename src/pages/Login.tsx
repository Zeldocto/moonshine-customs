import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../lib/errors'
import { AuthShell } from '../components/AuthShell'

export default function Login() {
  const { signIn, user, resendConfirmation } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  if (user) return <Navigate to={(location.state as { from?: string })?.from ?? '/'} replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      notify('Signed in.', 'success')
      navigate((location.state as { from?: string })?.from ?? '/')
    } catch (err) {
      const message = friendlyError(err, 'That sign-in did not work.')
      setError(message)
      setNeedsConfirmation(/confirm/i.test(message))
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    try {
      await resendConfirmation(email.trim())
      notify('Confirmation email sent.', 'success')
    } catch (err) {
      notify(friendlyError(err, 'Could not send that email.'), 'error')
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Vote, upload and manage your skins.">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            autoComplete="current-password"
            className="field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="notice-error">
            {error}
            {needsConfirmation && (
              <>
                {' '}
                <button type="button" className="underline" onClick={() => void handleResend()}>
                  Resend the confirmation email
                </button>
              </>
            )}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-5 flex justify-between text-sm">
        <Link to="/forgot-password">Forgot your password?</Link>
        <Link to="/register">Create an account</Link>
      </div>
    </AuthShell>
  )
}
