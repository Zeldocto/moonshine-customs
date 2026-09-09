import { supabase } from './supabase'
import type { Profile } from '../types/skin'

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

/** Case-insensitive lookup so /profile/Theo and /profile/theo both work. */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(
  id: string,
  patch: { username?: string; bio?: string | null; avatar_url?: string | null },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

export async function isUsernameAvailable(username: string, selfId?: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()
  if (error) throw error
  if (!data) return true
  return data.id === selfId
}

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error('Avatars must be a PNG, JPEG or WebP image.')
  if (file.size > AVATAR_MAX_BYTES) throw new Error('Avatars must be 2 MB or smaller.')

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  // Path is built from the session user id and a timestamp — never from the
  // uploaded filename, so "../" in a filename has nowhere to go.
  const path = `${userId}/avatar-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (error) throw error

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}
