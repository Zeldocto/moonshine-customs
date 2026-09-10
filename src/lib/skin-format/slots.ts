/**
 * THE SINGLE SOURCE OF TRUTH FOR THE MOONSHINE SKIN FORMAT.
 *
 * Everything downstream — the parser, the download file, the RGB dropdown,
 * and the 3D preview — reads this table. If Moonshine renames a key, adds a
 * color, or changes the enable bitmask, edit this file and nothing else.
 *
 * Derived from a real susamune.ini: the colors live under the region
 * sections `[creation_jp]` / `[creation_us]` as `key = R,G,B`.
 *
 * `enableBit` — susamune stores `mario_colors_enabled` / `fludd_colors_enabled`
 * as an integer. The observed sample had mario_colors_enabled = 64 with
 * mario_sunshine_shirt_rgb set to 0,0,0 and every other Mario color left at
 * 255,255,255, which is consistent with a bitmask indexed in key order
 * (bit 6 = the 7th Mario key). ⚠ CONFIRM THIS AGAINST THE MOONSHINE SOURCE.
 * If the mapping is different, change `enableBit` values here only.
 */

export type RGB = readonly [number, number, number]
export type SkinGroup = 'mario' | 'fludd'

export interface SkinSlot {
  /** Stable id used in the database jsonb and in the 3D material map. */
  id: string
  /** Exact key inside the `[creation_*]` ini section. */
  iniKey: string
  label: string
  group: SkinGroup
  /** Bit position within `<group>_colors_enabled`. */
  enableBit: number
  /** Color used when the slot is disabled or missing. */
  fallback: RGB
  /** Short note shown in the RGB dropdown. */
  hint?: string
}

export const SKIN_SLOTS: readonly SkinSlot[] = [
  { id: 'mario_cap',            iniKey: 'mario_cap_rgb',            label: 'Cap',             group: 'mario', enableBit: 0, fallback: [230, 45, 40] },
  { id: 'mario_shirt',          iniKey: 'mario_shirt_rgb',          label: 'Shirt',           group: 'mario', enableBit: 1, fallback: [230, 45, 40] },
  { id: 'mario_overalls',       iniKey: 'mario_overalls_rgb',       label: 'Overalls',        group: 'mario', enableBit: 2, fallback: [42, 74, 165] },
  { id: 'mario_gloves',         iniKey: 'mario_gloves_rgb',         label: 'Gloves',          group: 'mario', enableBit: 3, fallback: [255, 255, 255] },
  { id: 'mario_shoes',          iniKey: 'mario_shoes_rgb',          label: 'Shoes',           group: 'mario', enableBit: 4, fallback: [110, 60, 30] },
  { id: 'mario_sunglasses',     iniKey: 'mario_sunglasses_rgb',     label: 'Sunglasses',      group: 'mario', enableBit: 5, fallback: [25, 25, 30], hint: 'Only visible with shades on' },
  { id: 'mario_sunshine_shirt', iniKey: 'mario_sunshine_shirt_rgb', label: 'Shine shirt',     group: 'mario', enableBit: 6, fallback: [120, 210, 214], hint: 'Cyan Hawaiian-shirt base; the yellow shine sprites stay yellow' },

  { id: 'fludd_paint',          iniKey: 'fludd_paint_rgb',          label: 'Body paint',      group: 'fludd', enableBit: 0, fallback: [245, 224, 56] },
  { id: 'fludd_metal',          iniKey: 'fludd_metal_rgb',          label: 'Metal',           group: 'fludd', enableBit: 1, fallback: [170, 178, 186] },
  { id: 'fludd_straps',         iniKey: 'fludd_straps_rgb',         label: 'Straps',          group: 'fludd', enableBit: 2, fallback: [150, 90, 45] },
  { id: 'fludd_model_tank',     iniKey: 'fludd_model_tank_rgb',     label: 'Water tank',      group: 'fludd', enableBit: 3, fallback: [190, 222, 235] },
  { id: 'fludd_spray_nozzle',   iniKey: 'fludd_spray_nozzle_rgb',   label: 'Spray nozzle',    group: 'fludd', enableBit: 4, fallback: [235, 235, 235] },
  { id: 'fludd_hover_nozzle',   iniKey: 'fludd_hover_nozzle_rgb',   label: 'Hover nozzle',    group: 'fludd', enableBit: 5, fallback: [240, 200, 70] },
  { id: 'fludd_rocket_nozzle',  iniKey: 'fludd_rocket_nozzle_rgb',  label: 'Rocket nozzle',   group: 'fludd', enableBit: 6, fallback: [210, 70, 60] },
  { id: 'fludd_turbo_nozzle',   iniKey: 'fludd_turbo_nozzle_rgb',   label: 'Turbo nozzle',    group: 'fludd', enableBit: 7, fallback: [120, 200, 120] },
  { id: 'fludd_water',          iniKey: 'fludd_water_rgb',          label: 'Water',           group: 'fludd', enableBit: 8, fallback: [120, 200, 235] },
  { id: 'fludd_water_highlight',iniKey: 'fludd_water_highlight_rgb',label: 'Water highlight', group: 'fludd', enableBit: 9, fallback: [235, 250, 255] },
] as const

export const SLOT_BY_ID: Record<string, SkinSlot> = Object.fromEntries(
  SKIN_SLOTS.map((s) => [s.id, s]),
)

export const SLOT_BY_INI_KEY: Record<string, SkinSlot> = Object.fromEntries(
  SKIN_SLOTS.map((s) => [s.iniKey, s]),
)

export const ENABLE_KEYS: Record<SkinGroup, string> = {
  mario: 'mario_colors_enabled',
  fludd: 'fludd_colors_enabled',
}

/**
 * Spellings the parser will accept for the enable mask. Moonshine's own
 * spelling is the one in ENABLE_KEYS above and is what we write back out;
 * the British variant is read too so a settings file from a build that spells
 * it the other way still uploads instead of silently losing its mask.
 */
export const ENABLE_KEY_ALIASES: Record<SkinGroup, readonly string[]> = {
  mario: ['mario_colors_enabled', 'mario_colours_enabled'],
  fludd: ['fludd_colors_enabled', 'fludd_colours_enabled'],
}

export const GROUP_LABELS: Record<SkinGroup, string> = {
  mario: 'Mario',
  fludd: 'FLUDD',
}

/** Every bit set, for the group. */
export function allEnabledMask(group: SkinGroup): number {
  return SKIN_SLOTS.filter((s) => s.group === group).reduce(
    (mask, s) => mask | (1 << s.enableBit),
    0,
  )
}

export function isSlotEnabled(slot: SkinSlot, mask: number): boolean {
  return (mask & (1 << slot.enableBit)) !== 0
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Relative luminance, used to pick readable text over a swatch. */
export function isDark([r, g, b]: RGB): boolean {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55
}
