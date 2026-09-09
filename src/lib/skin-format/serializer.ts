/**
 * Builds the .txt a visitor downloads. It contains the colour keys and
 * nothing else — no ISO paths, no binds, no timer layout from whoever
 * uploaded it.
 */
import { ENABLE_KEYS, SKIN_SLOTS, isSlotEnabled, type SkinGroup } from './slots'
import type { SkinData } from '../../types/skin'

export interface SkinFileMeta {
  name: string
  author: string
  modVersion?: string | null
  sourceUrl?: string
}

export function buildSkinFile(data: SkinData, meta: SkinFileMeta): string {
  const lines: string[] = [
    '; Moonshine skin',
    `; Name    : ${sanitiseComment(meta.name)}`,
    `; Author  : ${sanitiseComment(meta.author)}`,
    meta.modVersion ? `; Built for: Moonshine ${sanitiseComment(meta.modVersion)}` : null,
    meta.sourceUrl ? `; Source  : ${sanitiseComment(meta.sourceUrl)}` : null,
    ';',
    '; Copy these keys into the [creation_<region>] section of your',
    '; susamune.ini, or enter the RGB values by hand in the mod menu.',
    '',
    '[creation]',
  ].filter((l): l is string => l !== null)

  for (const group of ['mario', 'fludd'] as SkinGroup[]) {
    for (const slot of SKIN_SLOTS.filter((s) => s.group === group)) {
      const rgb = data.slots[slot.id] ?? slot.fallback
      lines.push(`${slot.iniKey} = ${rgb[0]},${rgb[1]},${rgb[2]}`)
    }
    lines.push(`${ENABLE_KEYS[group]} = ${data.enabled[group] ?? 0}`)
  }

  return lines.join('\r\n') + '\r\n'
}

/** Comments are ini-safe as long as they stay on one line. */
function sanitiseComment(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').slice(0, 120)
}

/** "Sunset Mario" -> "sunset-mario.txt" */
export function skinFilename(name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'moonshine-skin'
  return `${slug}.txt`
}

export function enabledSummary(data: SkinData): string {
  const on = SKIN_SLOTS.filter((s) => isSlotEnabled(s, data.enabled[s.group] ?? 0)).length
  return `${on} of ${SKIN_SLOTS.length} colours enabled`
}
