import { supabase } from './supabase'
import { coerceSkinData } from './skin-format/parser'
import { buildSkinFile } from './skin-format/serializer'
import type { SkinData, SkinRecord, SortKey } from '../types/skin'

export const SKINS_BUCKET = 'skins'
export const PAGE_SIZE = 20

export interface BrowseParams {
  query?: string
  sort?: SortKey
  page?: number
  pageSize?: number
  authorId?: string
  tag?: string
}

export interface BrowseResult {
  skins: SkinRecord[]
  total: number
  page: number
  pageCount: number
}

function normalise(row: Record<string, unknown>): SkinRecord {
  return { ...(row as unknown as SkinRecord), colors: coerceSkinData(row.colors) }
}

/**
 * Sorting, filtering and paging all happen in Postgres (see search_skins in
 * 0002_functions.sql). The browser only ever receives one page of rows.
 */
export async function browseSkins(params: BrowseParams = {}): Promise<BrowseResult> {
  const pageSize = params.pageSize ?? PAGE_SIZE
  const page = Math.max(1, params.page ?? 1)

  const { data, error } = await supabase.rpc('search_skins', {
    p_query: params.query?.trim() || null,
    p_sort: params.sort ?? 'top',
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
    p_author: params.authorId ?? null,
    p_tag: params.tag ?? null,
  })
  if (error) throw error

  const rows = (data ?? []) as Record<string, unknown>[]
  const total = rows.length ? Number(rows[0].total_count) : 0

  return {
    skins: rows.map(normalise),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getSkin(id: string): Promise<SkinRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await supabase
    .from('skins_with_author')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? normalise(data) : null
}

export async function getSkinsByAuthor(userId: string, limit = 12): Promise<SkinRecord[]> {
  const { data, error } = await supabase
    .from('skins_with_author')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(normalise)
}

export async function getFeaturedSkins(limit = 3): Promise<SkinRecord[]> {
  const { data, error } = await supabase
    .from('skins_with_author')
    .select('*')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('score', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(normalise)
}

export interface SkinInput {
  name: string
  description: string
  tags: string[]
  modVersion: string
  colors: SkinData
  originalFilename: string | null
}

function fileBlob(colors: SkinData, name: string, author: string, modVersion: string): Blob {
  const text = buildSkinFile(colors, { name, author, modVersion })
  return new Blob([text], { type: 'text/plain' })
}

/**
 * Uploads the trimmed colour file, then writes the row. If the row write
 * fails the object is removed again, so a failed upload never leaves an
 * orphaned file in the bucket.
 */
export async function createSkin(
  userId: string,
  authorName: string,
  input: SkinInput,
): Promise<SkinRecord> {
  const id = crypto.randomUUID()
  const path = `${userId}/${id}.txt`
  const blob = fileBlob(input.colors, input.name, authorName, input.modVersion)

  const { error: uploadError } = await supabase.storage
    .from(SKINS_BUCKET)
    .upload(path, blob, { contentType: 'text/plain', upsert: false })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('skins')
    .insert({
      id,
      user_id: userId,
      name: input.name,
      description: input.description || null,
      tags: input.tags,
      mod_version: input.modVersion || null,
      colors: input.colors,
      file_path: path,
      file_size: blob.size,
      original_filename: input.originalFilename?.slice(0, 120) ?? null,
      status: 'published',
    })
    .select('id')
    .single()

  if (error) {
    await supabase.storage.from(SKINS_BUCKET).remove([path])
    throw error
  }

  const created = await getSkin(data.id)
  if (!created) throw new Error('Skin was created but could not be loaded.')
  return created
}

export async function updateSkin(
  skin: SkinRecord,
  input: SkinInput,
  colorsChanged: boolean,
): Promise<void> {
  let fileSize = skin.file_size

  if (colorsChanged) {
    const blob = fileBlob(input.colors, input.name, skin.author_username, input.modVersion)
    fileSize = blob.size
    // upsert overwrites in place: the path stays stable so existing links work.
    const { error: uploadError } = await supabase.storage
      .from(SKINS_BUCKET)
      .upload(skin.file_path, blob, { contentType: 'text/plain', upsert: true })
    if (uploadError) throw uploadError
  }

  const { error } = await supabase
    .from('skins')
    .update({
      name: input.name,
      description: input.description || null,
      tags: input.tags,
      mod_version: input.modVersion || null,
      colors: input.colors,
      file_size: fileSize,
    })
    .eq('id', skin.id)

  if (error) throw error
}

/**
 * Row first, then the file. If the object removal fails afterwards the worst
 * case is an unreferenced file in the bucket; deleting the file first could
 * leave a live row pointing at nothing.
 */
export async function deleteSkin(skin: SkinRecord): Promise<void> {
  const { error } = await supabase.from('skins').delete().eq('id', skin.id)
  if (error) throw error
  await supabase.storage.from(SKINS_BUCKET).remove([skin.file_path])
}

export async function getCommunityStats() {
  const { data, error } = await supabase.rpc('community_stats')
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) ?? {}
  return {
    skinCount: Number(row.skin_count ?? 0),
    creatorCount: Number(row.creator_count ?? 0),
    downloadTotal: Number(row.download_total ?? 0),
    voteTotal: Number(row.vote_total ?? 0),
  }
}
