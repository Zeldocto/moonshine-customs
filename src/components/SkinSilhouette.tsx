import { SKIN_SLOTS, isSlotEnabled, rgbToHex, type SkinSlot } from '../lib/skin-format/slots'
import type { SkinData } from '../types/skin'

/**
 * A flat, stylised Mario + FLUDD drawn as SVG and tinted from the same slot
 * data the 3D viewer uses.
 *
 * Grid cards use this instead of a WebGL canvas: twenty live canvases on one
 * page is a phone-melting amount of work for a thumbnail, and this reads the
 * skin just as clearly. The 3D viewer is reserved for the hero and the skin
 * page, where it is the point.
 */
export function SkinSilhouette({ skin, className }: { skin: SkinData; className?: string }) {
  const colour = (id: string) => {
    const slot = SKIN_SLOTS.find((s) => s.id === id) as SkinSlot
    const enabled = isSlotEnabled(slot, skin.enabled[slot.group] ?? 0)
    return rgbToHex(enabled ? (skin.slots[id] ?? slot.fallback) : slot.fallback)
  }

  const skinTone = '#F2C48D'

  return (
    <svg
      viewBox="0 0 200 190"
      className={className}
      role="img"
      aria-label="Mario and FLUDD coloured with this skin"
    >
      {/* FLUDD pack, drawn behind the body */}
      <g>
        <path
          d="M62 74 h76 a16 16 0 0 1 16 16 v30 a16 16 0 0 1 -16 16 h-76 a16 16 0 0 1 -16 -16 v-30 a16 16 0 0 1 16 -16 z"
          fill={colour('fludd_paint')}
        />
        <circle cx="100" cy="96" r="13" fill={colour('fludd_metal')} />
        <rect x="70" y="112" width="60" height="18" rx="9" fill={colour('fludd_model_tank')} opacity="0.95" />
        <rect x="48" y="128" width="17" height="22" rx="8" fill={colour('fludd_spray_nozzle')} />
        <rect x="135" y="128" width="17" height="22" rx="8" fill={colour('fludd_hover_nozzle')} />
        <rect x="86" y="132" width="12" height="18" rx="6" fill={colour('fludd_rocket_nozzle')} />
        <rect x="102" y="132" width="12" height="18" rx="6" fill={colour('fludd_turbo_nozzle')} />
        <path d="M56 150 q0 20 -8 32 q16 -6 16 -32 z" fill={colour('fludd_water')} opacity="0.8" />
        <circle cx="44" cy="180" r="5" fill={colour('fludd_water_highlight')} opacity="0.9" />
      </g>

      {/* straps */}
      <path d="M78 70 l-6 60 h12 l4 -60 z" fill={colour('fludd_straps')} />
      <path d="M122 70 l6 60 h-12 l-4 -60 z" fill={colour('fludd_straps')} />

      {/* legs + shoes */}
      <path d="M82 128 h36 l4 34 h-44 z" fill={colour('mario_overalls')} />
      <ellipse cx="78" cy="168" rx="18" ry="10" fill={colour('mario_shoes')} />
      <ellipse cx="122" cy="168" rx="18" ry="10" fill={colour('mario_shoes')} />

      {/* torso */}
      <path
        d="M74 74 h52 a10 10 0 0 1 10 10 v34 a10 10 0 0 1 -10 10 h-52 a10 10 0 0 1 -10 -10 v-34 a10 10 0 0 1 10 -10 z"
        fill={colour('mario_shirt')}
      />
      {/* overalls bib over the shirt */}
      <path d="M82 92 h36 v36 h-36 z" fill={colour('mario_overalls')} />
      {/* shine emblem */}
      <path
        d="M100 98 l5 10 l11 2 l-8 8 l2 11 l-10 -5 l-10 5 l2 -11 l-8 -8 l11 -2 z"
        fill={colour('mario_sunshine_shirt')}
      />

      {/* arms + gloves */}
      <rect x="52" y="80" width="16" height="34" rx="8" fill={colour('mario_shirt')} />
      <rect x="132" y="80" width="16" height="34" rx="8" fill={colour('mario_shirt')} />
      <circle cx="60" cy="120" r="11" fill={colour('mario_gloves')} />
      <circle cx="140" cy="120" r="11" fill={colour('mario_gloves')} />

      {/* head */}
      <circle cx="100" cy="48" r="26" fill={skinTone} />
      <circle cx="112" cy="52" r="7" fill={skinTone} />
      {/* sunglasses */}
      <rect x="80" y="42" width="40" height="10" rx="5" fill={colour('mario_sunglasses')} />
      {/* cap */}
      <path d="M74 38 a26 26 0 0 1 52 0 z" fill={colour('mario_cap')} />
      <path d="M100 34 h30 a8 8 0 0 1 0 12 h-30 z" fill={colour('mario_cap')} />
    </svg>
  )
}
