import { createClient } from '@supabase/supabase-js'

/**
 * supabase-js wants the bare project origin (https://<ref>.supabase.co) and
 * appends /auth/v1, /rest/v1 and /storage/v1 itself.
 *
 * The dashboard also shows a REST endpoint that already ends in /rest/v1/, and
 * pasting that one produces requests to /rest/v1/auth/v1/signup, which 404.
 * The visible symptom is every auth call failing with "That account could not
 * be created". Trimming it here means either value works.
 */
function normaliseProjectUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim().replace(/\/+$/, '')
  return trimmed.replace(/\/(rest|auth|storage|realtime)\/v\d+$/i, '')
}

const url = normaliseProjectUrl(import.meta.env.VITE_SUPABASE_URL)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

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
