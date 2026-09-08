import { useState } from 'react'
import {
  GROUP_LABELS,
  SKIN_SLOTS,
  isDark,
  isSlotEnabled,
  rgbToHex,
  type SkinGroup,
} from '../lib/skin-format/slots'
import type { SkinData } from '../types/skin'

/**
 * The "type it in yourself" view: every slot with its exact R,G,B, so anyone
 * can reproduce a skin from the mod menu without downloading a file.
 */
export function ColorList({ skin, open = false }: { skin: SkinData; open?: boolean }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600)
    } catch {
      setCopied(null)
    }
  }

  return (
    <details className="surface overflow-hidden" open={open}>
      <summary className="cursor-pointer select-none px-4 py-3 font-display text-lg font-bold">
        RGB values
        <span className="ml-2 font-body text-sm font-normal text-inkSoft">
          for entering by hand in the mod menu
        </span>
      </summary>

      <div className="border-t border-sandDeep px-4 pb-4 pt-3">
        {(['mario', 'fludd'] as SkinGroup[]).map((group) => (
          <section key={group} className="mb-4 last:mb-0">
            <h4 className="mb-2 text-base">{GROUP_LABELS[group]}</h4>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {SKIN_SLOTS.filter((slot) => slot.group === group).map((slot) => {
                const enabled = isSlotEnabled(slot, skin.enabled[group] ?? 0)
                const rgb = skin.slots[slot.id] ?? slot.fallback
                const value = `${rgb[0]},${rgb[1]},${rgb[2]}`
                return (
                  <li key={slot.id} className="flex items-center gap-2.5">
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg border border-ink/15"
                      style={{ background: rgbToHex(rgb), opacity: enabled ? 1 : 0.35 }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {slot.label}
                        {!enabled && <span className="ml-1.5 text-xs text-inkSoft">(off)</span>}
                      </span>
                      <span className="block text-xs text-inkSoft">{slot.hint}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void copy(slot.id, value)}
                      className="rounded-lg border-2 border-sandDeep px-2 py-1 text-xs font-semibold tabular-nums hover:border-ink/30"
                      style={
                        copied === slot.id
                          ? { background: rgbToHex(rgb), color: isDark(rgb) ? '#fff' : '#14323c' }
                          : undefined
                      }
                      aria-label={`Copy ${slot.label} value ${value}`}
                    >
                      {copied === slot.id ? 'Copied' : value}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </details>
  )
}

/** Compact palette strip used along the top of a card. */
export function PaletteStrip({ skin }: { skin: SkinData }) {
  const swatches = SKIN_SLOTS.filter((slot) => isSlotEnabled(slot, skin.enabled[slot.group] ?? 0))
  const shown = (swatches.length ? swatches : SKIN_SLOTS.slice(0, 6)).slice(0, 12)

  return (
    <div className="flex h-2 w-full" aria-hidden="true">
      {shown.map((slot) => (
        <span
          key={slot.id}
          className="h-full flex-1"
          style={{ background: rgbToHex(skin.slots[slot.id] ?? slot.fallback) }}
        />
      ))}
    </div>
  )
}
