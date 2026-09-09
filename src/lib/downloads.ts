import { supabase, publicFileUrl } from './supabase'
import { SKINS_BUCKET } from './skins'
import { buildSkinFile, skinFilename } from './skin-format/serializer'
import { appUrl } from './supabase'
import type { SkinRecord } from '../types/skin'

/**
 * Counting happens server-side in the record_download() function, which also
 * de-duplicates repeat downloads by the same signed-in user on the same day.
 * The client cannot set download_count directly — it has no grant on it.
 */
export async function recordDownload(skinId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('record_download', { p_skin_id: skinId })
  if (error) {
    // A failed count must never block the actual download.
    if (import.meta.env.DEV) console.warn('download not counted', error)
    return null
  }
  return Number(data)
}

async function fetchStoredFile(skin: SkinRecord): Promise<string | null> {
  try {
    const response = await fetch(publicFileUrl(SKINS_BUCKET, skin.file_path), { cache: 'no-store' })
    if (!response.ok) return null
    const text = await response.text()
    return text.length > 0 && text.length <= 51200 ? text : null
  } catch {
    return null
  }
}

/**
 * Downloads the stored file. If the object is somehow unreachable the file is
 * rebuilt from the colours in the database, so the button never dead-ends.
 */
export async function downloadSkin(skin: SkinRecord): Promise<number | null> {
  const stored = await fetchStoredFile(skin)
  const contents =
    stored ??
    buildSkinFile(skin.colors, {
      name: skin.name,
      author: skin.author_username,
      modVersion: skin.mod_version,
      sourceUrl: appUrl(`skin/${skin.id}`),
    })

  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = skinFilename(skin.name)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return recordDownload(skin.id)
}
