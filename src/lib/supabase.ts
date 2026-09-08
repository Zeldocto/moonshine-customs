import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Both values are public by design. The anon key is a JWT that says nothing
 * more than "an anonymous visitor"; every table is behind Row Level Security,
 * so possessing it grants exactly the access the policies grant.
 *
 * The service-role key is the opposite: it bypasses RLS entirely. It must
 * never appear in this file, in any VITE_ variable, or anywhere in this repo.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    'Supabase is not configured. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'moonshine-skins-auth',
  },
  global: {
    headers: { 'x-application-name': 'moonshine-skins' },
  },
})

/** Absolute URL of the deployed app, base path included. */
export function appUrl(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/${path.replace(/^\//, '')}`
}

export function publicFileUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
