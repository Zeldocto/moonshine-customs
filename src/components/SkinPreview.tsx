import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { SkinSilhouette } from './SkinSilhouette'
import { isWebGLAvailable } from '../lib/webgl'
import type { SkinData } from '../types/skin'

// three + drei are the heaviest thing on the site, so they load in their own
// chunk, only once a viewer actually scrolls to a preview.
const MarioViewer = lazy(() => import('./preview/MarioViewer'))

interface SkinPreviewProps {
  skin: SkinData
  height?: number
  /** Show checkboxes for the optional cosmetic parts (detail page only). */
  showPartToggles?: boolean
  /** Renders the flat SVG instead of WebGL. Used by grid cards. */
  flat?: boolean
  className?: string
}

/**
 * SkinPreview ▸ MarioViewer ▸ PlaceholderMario / GltfMario ▸ applySkinToModel
 */
export function SkinPreview({
  skin,
  height = 320,
  flat = false,
  className,
  showPartToggles = false,
}: SkinPreviewProps) {
  // Both parts are optional in game, so default to wearing them.
  const [shineShirt, setShineShirt] = useState(true)
  const [sunglasses, setSunglasses] = useState(true)
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  // Evaluated once, on the client, before any Canvas is mounted.
  const [webgl] = useState(isWebGLAvailable)

  useEffect(() => {
    if (flat || !webgl || !container.current) return
    const node = container.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [flat, webgl])

  if (flat) {
    return (
      <div className={className}>
        <SkinSilhouette skin={skin} className="h-full w-full" />
      </div>
    )
  }

  const placeholder = (
    <div
      style={{ height }}
      className="flex w-full items-center justify-center rounded-chip stage"
    >
      <SkinSilhouette skin={skin} className="h-4/5 w-auto opacity-70" />
    </div>
  )

  // WebGL is off (LibreWolf, RFP, Tor, some locked-down mobile browsers).
  // Fall back to the SVG rather than letting the renderer throw.
  if (!webgl) {
    return (
      <div className={className}>
        {placeholder}
        <p className="mt-2 text-center text-xs text-ink/60">
          3D preview needs WebGL, which this browser has turned off. Showing flat colors instead.
        </p>
      </div>
    )
  }

  return (
    <div ref={container} className={className}>
      {visible ? (
        <Suspense fallback={placeholder}>
          <MarioViewer skin={skin} height={height} parts={{ shineShirt, sunglasses }} />
        </Suspense>
      ) : (
        placeholder
      )}

      {showPartToggles && visible && (
        <fieldset className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <legend className="sr-only">Optional outfit parts</legend>
          <PartToggle label="Shine shirt" checked={shineShirt} onChange={setShineShirt} />
          <PartToggle label="Sunglasses" checked={sunglasses} onChange={setSunglasses} />
        </fieldset>
      )}
    </div>
  )
}

/** Plain checkbox: keyboard reachable, visible focus ring, no hover-only state. */
function PartToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-ink/30 text-lagoon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon"
      />
      {label}
    </label>
  )
}
