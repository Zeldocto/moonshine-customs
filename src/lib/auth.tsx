import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, appUrl } from './supabase'
import { getProfileById } from './profiles'
import type { Profile } from '../types/skin'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      const next = await getProfileById(userId)
      if (mounted.current) setProfile(next)
    } catch {
      if (mounted.current) setProfile(null)
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return
      setSession(data.session)
      void loadProfile(data.session?.user.id).finally(() => {
        if (mounted.current) setLoading(false)
      })
    })

    // Fires on sign in/out, token refresh, and when a stored session turns out
    // to be expired — which is how expired sessions get cleaned up here.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current) return
      setSession(nextSession)
      void loadProfile(nextSession?.user.id)
    })

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,

      async signUp(email, password, username) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Read by the handle_new_user() trigger to seed the profile row.
            data: { username },
            emailRedirectTo: appUrl('auth/callback'),
          },
        })
        if (error) throw error
        // Supabase returns a user with no session when confirmation is required.
        return { needsConfirmation: !data.session }
      },

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },

      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setProfile(null)
      },

      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: appUrl('reset-password'),
        })
        if (error) throw error
      },

      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      },

      async resendConfirmation(email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: appUrl('auth/callback') },
        })
        if (error) throw error
      },

      async refreshProfile() {
        await loadProfile(session?.user.id)
      },
    }),
    [session, profile, loading, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
