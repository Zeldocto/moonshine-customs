import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { applySkinToModel, isolateMaterials, setPartVisibility } from './applySkin'
import type { PartVisibility } from './applySkin'
import type { SkinData } from '../../types/skin'

/**
 * Renders the real model once MARIO_MODEL_URL is set in modelConfig.ts.
 * Untested against an actual asset — the mesh/material names in
 * MATERIAL_MATCHERS need filling in from whatever you export.
 */
export function GltfMario({
  url,
  skin,
  parts,
}: {
  url: string
  skin: SkinData
  parts?: PartVisibility
}) {
  const { scene } = useGLTF(url)
  const root = useRef<THREE.Group>(null)

  // Each preview gets its own copy so tinting one does not tint the others.
  const cloned = useMemo(() => {
    const copy = scene.clone(true)
    isolateMaterials(copy)
    return copy
  }, [scene])

  useLayoutEffect(() => {
    if (root.current) applySkinToModel(skin, root.current)
  }, [skin, cloned])

  // Optional cosmetic parts. Separate effect so toggling them does not
  // re-run the (more expensive) skin application.
  useLayoutEffect(() => {
    if (root.current && parts) setPartVisibility(root.current, parts)
  }, [parts, cloned])

  return (
    <group ref={root} position={[0, -1.05, 0]}>
      <primitive object={cloned} />
    </group>
  )
}
