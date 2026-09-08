/**
 * Client-side validation. Convenience only — every rule here is also a CHECK
 * constraint, a trigger or an RLS policy in Postgres. Removing this file would
 * make the app ruder, not less secure.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,24}$/

// Mirrors the seed of public.blocked_words. Keep the two in step; the database
// copy is the one that is actually enforced.
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'rape', 'nazi',
  'admin', 'moderator', 'moonshine', 'official', 'support', 'system',
]

function normalise(value: string): string {
  const map: Record<string, string> = {
    '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
    '@': 'a', $: 's', '!': 'i',
  }
  return value.toLowerCase().replace(/[013457 8@$!]/g, (c) => map[c] ?? c)
}

export function validateUsername(username: string): string | null {
  const value = username.trim()
  if (!value) return 'Pick a username.'
  if (!USERNAME_PATTERN.test(value))
    return 'Usernames are 3–24 characters: letters, numbers, hyphen or underscore.'
  const flat = normalise(value)
  if (BLOCKED.some((word) => flat.includes(word))) return 'That username is not allowed. Try another.'
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return 'Mix in at least one letter and one number.'
  return null
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Enter a valid email address.'
  return null
}

export function validateSkinName(name: string): string | null {
  const value = name.trim()
  if (value.length < 3) return 'Skin names need at least 3 characters.'
  if (value.length > 60) return 'Skin names are limited to 60 characters.'
  return null
}

export function normaliseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((t) => t.trim().toLowerCase().slice(0, 24))
        .filter((t) => /^[a-z0-9][a-z0-9 _-]{0,23}$/.test(t)),
    ),
  ).slice(0, 8)
}
