/**
 * Dev-only harness for eyeballing the 3D Mario preview. Not linked in the UI;
 * the route is registered only when import.meta.env.DEV (see App.tsx) and is
 * driven by scripts/preview-shot.mjs.
 *
 * Query params:
 *   angle=<deg>   orbit angle around Y            (default 20)
 *   elev=<deg>    camera elevation                (default 6)
 *   dist=<units>  camera distance                 (default 4.2)
 *   raw=1         render the .glb with NO skin code (stock materials), to tell
 *                 "baked into the model" apart from "tinting bug"
 *   empty=1       apply an all-slots-disabled skin (raw texture through the
 *                 real code path) — vs the default, which is the site's real
 *                 baseline: coerceSkinData(null), every slot at its fallback
 *   hide=a,b      mesh names to hide (e.g. mario_sunglasses,fludd_paint)
 *   skin=mario_cap:40,170,60;mario_overalls:200,0,120   overrides on the default
 *
 * Fixed camera, no auto-rotate, no idle bob, so screenshots are reproducible.
 */
import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, useGLTF } from '@react-three/drei'
import { useSearchParams } from 'react-router-dom'
import { GltfMario } from '../components/preview/GltfMario'
import { MARIO_MODEL_URL } from '../components/preview/modelConfig'
import { SKIN_SLOTS } from '../lib/skin-format/slots'
import { coerceSkinData } from '../lib/skin-format/parser'
import type { SkinData } from '../types/skin'

// What the site actually renders when a skin leaves slots at default: every
// slot enabled, each at its fallback colour. Use this as the baseline, not a
// blank skin — a blank skin hides fallback-colour bugs.
const DEFAULT_SKIN: SkinData = coerceSkinData(null)
const EMPTY_SKIN: SkinData = { version: 1, slots: {}, enabled: { mario: 0, fludd: 0 } }
const BIT = Object.fromEntries(
  SKIN_SLOTS.filter((s) => s.group === 'mario').map((s) => [s.id, s.enableBit]),
) as Record<string, number>

function parseSkin(s: string | null, empty: boolean): SkinData {
  if (empty) return EMPTY_SKIN
  if (!s) return DEFAULT_SKIN
  // Overrides layered on top of the real default skin.
  const slots = { ...DEFAULT_SKIN.slots }
  let mask = DEFAULT_SKIN.enabled.mario
  for (const part of s.split(';')) {
    const [id, rgb] = part.split(':')
    const nums = (rgb ?? '').split(',').map(Number)
    if (nums.length !== 3 || nums.some(Number.isNaN)) continue
    slots[id.trim()] = [nums[0], nums[1], nums[2]]
    if (BIT[id.trim()] != null) mask |= 1 << BIT[id.trim()]
  }
  return { version: DEFAULT_SKIN.version, slots, enabled: { mario: mask, fludd: DEFAULT_SKIN.enabled.fludd } }
}

/** Stock .glb, no applySkin — shows what is baked into the model file. */
function RawModel({ url, hide }: { url: string; hide: string[] }) {
  const { scene } = useGLTF(url)
  const copy = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      if (hide.includes(o.name)) o.visible = false
    })
    return c
  }, [scene, hide])
  return (
    <group position={[0, -1.05, 0]}>
      <primitive object={copy} />
    </group>
  )
}

/** Real preview path (GltfMario + applySkin), with meshes optionally hidden. */
function TintedModel({ url, hide, skin }: { url: string; hide: string[]; skin: SkinData }) {
  const { scene } = useGLTF(url)
  // Toggle visibility on the shared graph before GltfMario clones it.
  useMemo(() => {
    scene.traverse((o) => {
      o.visible = !hide.includes(o.name)
    })
  }, [scene, hide])
  return <GltfMario url={url} skin={skin} />
}

export default function PreviewTest() {
  const [params] = useSearchParams()
  const angle = ((Number(params.get('angle') ?? '20') || 0) * Math.PI) / 180
  const elev = ((Number(params.get('elev') ?? '6') || 0) * Math.PI) / 180
  const dist = Number(params.get('dist') ?? '4.2') || 4.2
  const raw = params.get('raw') === '1'
  const hide = (params.get('hide') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const skin = useMemo(() => parseSkin(params.get('skin'), params.get('empty') === '1'), [params])

  const camX = Math.sin(angle) * Math.cos(elev) * dist
  const camY = 0.5 + Math.sin(elev) * dist
  const camZ = Math.cos(angle) * Math.cos(elev) * dist

  if (!MARIO_MODEL_URL) return <p style={{ padding: 24 }}>MARIO_MODEL_URL is null.</p>

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#8a8de0' }}>
      <Canvas
        shadows
        camera={{ position: [camX, camY, camZ], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onCreated={({ camera }) => camera.lookAt(0, 0.35, 0)}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#9ad8e6" />
        <Suspense fallback={null}>
          {raw ? (
            <RawModel url={MARIO_MODEL_URL} hide={hide} />
          ) : (
            <TintedModel url={MARIO_MODEL_URL} hide={hide} skin={skin} />
          )}
          <ContactShadows position={[0, -1.08, 0]} opacity={0.32} scale={7} blur={2.6} far={3} />
          <Environment preset="park" />
        </Suspense>
      </Canvas>
      <div style={{ position: 'fixed', top: 8, left: 8, font: '12px monospace', color: '#fff' }}>
        angle={params.get('angle') ?? '20'} raw={String(raw)} hide=[{hide.join(',')}]
      </div>
    </div>
  )
}
