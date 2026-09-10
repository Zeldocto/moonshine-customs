/**
 * Moonshine skin parser.
 *
 * Input: a susamune/Moonshine settings .ini (or a trimmed skin file produced
 * by this site). Output: only the Mario + FLUDD color data. Everything else
 * in the file — ISO paths, binds, timer layout — is discarded here and never
 * reaches the network, so uploading a settings file cannot leak your SD card
 * paths or key binds.
 *
 * The parser is deliberately tolerant of unknown sections and keys so a newer
 * Moonshine build does not break uploads, and deliberately strict about the
 * values it does read.
 */
import {
  ENABLE_KEY_ALIASES,
  SKIN_SLOTS,
  SLOT_BY_INI_KEY,
  allEnabledMask,
  type RGB,
  type SkinGroup,
} from './slots'
import type { ParseResult, ParsedSkinCandidate, SkinData } from '../../types/skin'

export const CURRENT_FORMAT_VERSION = 1
export const MAX_SKIN_FILE_BYTES = 50 * 1024

/** Sections that may hold colors: `[creation]`, `[creation_jp]`, `[creation_us]`, … */
const CREATION_SECTION = /^creation(?:_([a-z0-9]{1,8}))?$/i

const REGION_LABELS: Record<string, string> = { jp: 'JP', us: 'US', pal: 'PAL' }

export class SkinParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SkinParseError'
  }
}

function parseRgb(raw: string): RGB | null {
  const parts = raw.split(',')
  if (parts.length !== 3) return null
  const nums = parts.map((p) => {
    const t = p.trim()
    if (!/^\d{1,3}$/.test(t)) return NaN
    return Number(t)
  })
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return [nums[0], nums[1], nums[2]] as RGB
}

/** Splits an ini into `{ sectionName: { key: value } }`. Unknown lines ignored. */
function parseIni(text: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>()
  let current = '_root'
  sections.set(current, new Map())

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith(';') || line.startsWith('#')) continue

    const header = /^\[([^\]]{1,64})\]$/.exec(line)
    if (header) {
      current = header[1].trim().toLowerCase()
      if (!sections.has(current)) sections.set(current, new Map())
      continue
    }

    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim().toLowerCase()
    const value = line.slice(eq + 1).trim()
    if (key) sections.get(current)!.set(key, value)
  }

  return sections
}

/**
 * Rejects anything that is not plain text before we look at the contents:
 * NUL bytes and other C0 control characters are the cheapest signal that
 * someone renamed a binary to .ini.
 */
export function assertLooksLikeText(text: string): void {
  if (text.length === 0) throw new SkinParseError('That file is empty.')
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    throw new SkinParseError('That file contains binary data. Upload the .ini settings file.')
  }
}

function sectionToCandidate(
  sectionName: string,
  entries: Map<string, string>,
  warnings: string[],
): ParsedSkinCandidate | null {
  const slots: Record<string, RGB> = {}
  let found = 0

  for (const [key, value] of entries) {
    const slot = SLOT_BY_INI_KEY[key]
    if (!slot) continue
    const rgb = parseRgb(value)
    if (!rgb) {
      warnings.push(`[${sectionName}] ${key} is not a valid "R,G,B" value and was skipped.`)
      continue
    }
    slots[slot.id] = rgb
    found++
  }

  if (found === 0) return null

  const enabled = {} as Record<SkinGroup, number>
  for (const group of ['mario', 'fludd'] as SkinGroup[]) {
    const raw = ENABLE_KEY_ALIASES[group]
      .map((key) => entries.get(key))
      .find((v) => v !== undefined)
    const parsed = raw !== undefined && /^\d{1,10}$/.test(raw.trim()) ? Number(raw.trim()) : NaN
    // A file with colors but no mask (e.g. a hand-written skin) is treated as
    // "use every color it defines" rather than "use none".
    enabled[group] = Number.isFinite(parsed) ? parsed & allEnabledMask(group) : slotsMask(slots, group)
  }

  // Fill any slot the file did not mention so the preview is always complete.
  for (const slot of SKIN_SLOTS) {
    if (!slots[slot.id]) slots[slot.id] = slot.fallback
  }

  const region = CREATION_SECTION.exec(sectionName)?.[1]?.toLowerCase()
  const data: SkinData = { version: CURRENT_FORMAT_VERSION, slots, enabled }

  return {
    section: sectionName,
    regionLabel: region ? (REGION_LABELS[region] ?? region.toUpperCase()) : 'Default',
    data,
    customizedCount: countCustomized(data),
  }
}

function slotsMask(slots: Record<string, RGB>, group: SkinGroup): number {
  return SKIN_SLOTS.filter((s) => s.group === group && slots[s.id]).reduce(
    (mask, s) => mask | (1 << s.enableBit),
    0,
  )
}

/** Slots that are both enabled and not plain white — a proxy for "actually styled". */
export function countCustomized(data: SkinData): number {
  return SKIN_SLOTS.filter((slot) => {
    const mask = data.enabled[slot.group] ?? 0
    if ((mask & (1 << slot.enableBit)) === 0) return false
    const rgb = data.slots[slot.id]
    return !!rgb && !(rgb[0] === 255 && rgb[1] === 255 && rgb[2] === 255)
  }).length
}

export function parseMoonshineIni(text: string): ParseResult {
  assertLooksLikeText(text)

  const warnings: string[] = []
  const sections = parseIni(text)
  const candidates: ParsedSkinCandidate[] = []

  for (const [name, entries] of sections) {
    if (!CREATION_SECTION.test(name)) continue
    const candidate = sectionToCandidate(name, entries, warnings)
    if (candidate) candidates.push(candidate)
  }

  if (candidates.length === 0) {
    throw new SkinParseError(
      'No Mario or FLUDD colors found. Upload the susamune.ini written by Moonshine — the colors live in its [creation] section.',
    )
  }

  // Most-customized first, so the upload page can preselect the interesting one.
  candidates.sort((a, b) => b.customizedCount - a.customizedCount)
  return { candidates, warnings }
}

/** Runtime guard for `colors` coming back from the database. */
export function isSkinData(value: unknown): value is SkinData {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<SkinData>
  if (typeof v.version !== 'number' || !v.slots || !v.enabled) return false
  return Object.values(v.slots).every(
    (rgb) =>
      Array.isArray(rgb) &&
      rgb.length === 3 &&
      rgb.every((n) => Number.isInteger(n) && n >= 0 && n <= 255),
  )
}

/** Last line of defense before render: never trust a jsonb blob. */
export function coerceSkinData(value: unknown): SkinData {
  const base: SkinData = {
    version: CURRENT_FORMAT_VERSION,
    slots: {},
    enabled: { mario: allEnabledMask('mario'), fludd: allEnabledMask('fludd') },
  }
  if (isSkinData(value)) {
    for (const slot of SKIN_SLOTS) {
      const rgb = value.slots[slot.id]
      base.slots[slot.id] = rgb ?? slot.fallback
    }
    base.enabled = {
      mario: Number(value.enabled.mario) & allEnabledMask('mario'),
      fludd: Number(value.enabled.fludd) & allEnabledMask('fludd'),
    }
    base.version = value.version
    return base
  }
  for (const slot of SKIN_SLOTS) base.slots[slot.id] = slot.fallback
  return base
}
