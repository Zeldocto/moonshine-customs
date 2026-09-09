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
  /** Renders the flat SVG instead of WebGL. Used by grid cards. */
  flat?: boolean
  className?: string
}

/**
 * SkinPreview ▸ MarioViewer ▸ PlaceholderMario / GltfMario ▸ applySkinToModel
 */
export function SkinPreview({ skin, height = 320, flat = false, className }: SkinPreviewProps) {
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
      className="flex w-full items-center justify-center rounded-chip bg-gradient-to-b from-[#DFF3F5] to-[#F6E7C8]"
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
          3D preview needs WebGL, which this browser has turned off. Showing flat colours instead.
        </p>
      </div>
    )
  }

  return (
    <div ref={container} className={className}>
      {visible ? (
        <Suspense fallback={placeholder}>
          <MarioViewer skin={skin} height={height} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  )
}
