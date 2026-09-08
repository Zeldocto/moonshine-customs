import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { PageSpinner } from '../components/Loaders'

/** Landing page for the email confirmation link. */
export default function AuthCallback() {
  const { user, loading } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (user) {
      notify('Email confirmed. You are signed in.', 'success')
      navigate('/', { replace: true })
    } else {
      notify('That confirmation link is no longer valid. Try signing in.', 'error')
      navigate('/login', { replace: true })
    }
  }, [loading, user, navigate, notify])

  return <PageSpinner label="Finishing sign-in" />
}
