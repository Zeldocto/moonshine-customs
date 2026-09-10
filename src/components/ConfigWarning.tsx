import { isSupabaseConfigured } from '../lib/supabase'

/** Shown when the two public env vars are missing, so a fresh clone explains itself. */
export function ConfigWarning() {
  if (isSupabaseConfigured) return null
  return (
    <div className="border-b-2 border-coral/50 bg-coral/12 px-4 py-3 text-center text-sm text-coralDeep">
      <strong className="font-display">Supabase is not configured.</strong> Copy{' '}
      <code>.env.example</code> to <code>.env</code> and set{' '}
      <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev
      server. Browsing and signing in will fail until then.
    </div>
  )
}
