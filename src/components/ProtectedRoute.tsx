import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { PageSpinner } from './Loaders'

/**
 * Keeps signed-out visitors off authenticated pages. This is a courtesy, not
 * a security control — the real check is Row Level Security, which rejects
 * the write even if someone renders this component's children by hand.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageSpinner label="Checking your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
