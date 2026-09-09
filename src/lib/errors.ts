/**
 * Translates whatever the backend threw into something a person can act on.
 * Raw Postgres messages (constraint names, table names, SQLSTATE) never reach
 * the UI — they go to the console in dev only.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email and password combination did not work.',
  email_not_confirmed: 'Check your inbox and confirm your email address first.',
  user_already_exists: 'An account already exists for that email address.',
  over_email_send_rate_limit: 'Too many emails requested. Wait a few minutes and try again.',
  weak_password: 'Pick a longer password — at least 8 characters.',
  same_password: 'That is already your current password.',
  username_not_allowed: 'That username is taken or not allowed. Try another.',
  skin_not_available: 'That skin is no longer available.',
}

const CODE_HINTS: [RegExp, string][] = [
  [/profiles_username_lower_key/i, 'That username is already taken.'],
  [/username_shape/i, 'Usernames are 3–24 characters: letters, numbers, hyphen or underscore.'],
  [/username_not_allowed/i, 'That username is taken or not allowed. Try another.'],
  [/skin_name_length/i, 'Skin names must be between 3 and 60 characters.'],
  [/skin_description_length/i, 'Descriptions are limited to 1000 characters.'],
  [/skin_tag_count/i, 'You can add up to 8 tags.'],
  [/skin_file_size/i, 'Skin files must be 50 KB or smaller.'],
  [/skin_downloads_once_per_day/i, 'You already downloaded this skin today.'],
  [/row-level security|violates row-level/i, 'You do not have permission to do that.'],
  [/duplicate key/i, 'That already exists.'],
  [/Failed to fetch|NetworkError|fetch failed/i, 'Cannot reach the server. Check your connection and try again.'],
  [/exceeded the maximum allowed size|Payload too large/i, 'That file is too large.'],
  [/mime type .* is not supported/i, 'That file type is not allowed here.'],
]

export function friendlyError(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (import.meta.env.DEV) console.error(error)
  if (!error) return fallback

  const raw =
    typeof error === 'string'
      ? error
      : ((error as { message?: string; error_description?: string }).message ??
        (error as { error_description?: string }).error_description ??
        '')

  const code = (error as { code?: string }).code
  if (code && MESSAGES[code]) return MESSAGES[code]

  for (const key of Object.keys(MESSAGES)) {
    if (raw.includes(key)) return MESSAGES[key]
  }
  for (const [pattern, message] of CODE_HINTS) {
    if (pattern.test(raw)) return message
  }

  // Auth messages from Supabase are already user-facing and safe to show.
  if (/password|email|token|expired|session/i.test(raw) && raw.length < 140) return raw

  return fallback
}
