import type { RGB, SkinGroup } from '../lib/skin-format/slots'

/** Shape stored in `skins.colors` (jsonb) and produced by the parser. */
export interface SkinData {
  /** Bumped when the on-disk format changes; the parser branches on it. */
  version: number
  slots: Record<string, RGB>
  enabled: Record<SkinGroup, number>
}

export interface ParsedSkinCandidate {
  /** e.g. "creation_jp" */
  section: string
  /** "JP" | "US" | "PAL" | section name */
  regionLabel: string
  data: SkinData
  /** How many slots differ from plain white — used to pick a default. */
  customizedCount: number
}

export interface ParseResult {
  candidates: ParsedSkinCandidate[]
  warnings: string[]
}

export interface SkinRecord {
  id: string
  user_id: string
  name: string
  description: string | null
  tags: string[]
  mod_version: string | null
  format_version: number
  colors: SkinData
  file_path: string
  file_size: number
  original_filename: string | null
  status: 'published' | 'hidden' | 'removed'
  is_featured: boolean
  upvote_count: number
  downvote_count: number
  score: number
  download_count: number
  created_at: string
  updated_at: string
  author_username: string
  author_avatar_url: string | null
}

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  role: 'user' | 'moderator' | 'admin'
  is_banned: boolean
  created_at: string
  updated_at: string
}

export type SortKey = 'top' | 'downloads' | 'new' | 'old' | 'updated'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'top', label: 'Most upvoted' },
  { value: 'downloads', label: 'Most downloaded' },
  { value: 'new', label: 'Newest' },
  { value: 'old', label: 'Oldest' },
  { value: 'updated', label: 'Recently updated' },
]
