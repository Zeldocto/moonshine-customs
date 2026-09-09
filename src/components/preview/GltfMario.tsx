import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { applySkinToModel, isolateMaterials } from './applySkin'
import type { SkinData } from '../../types/skin'

/**
 * Renders the real model once MARIO_MODEL_URL is set in modelConfig.ts.
 * Untested against an actual asset — the mesh/material names in
 * MATERIAL_MATCHERS need filling in from whatever you export.
 */
export function GltfMario({ url, skin }: { url: string; skin: SkinData }) {
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

  return (
    <group ref={root} position={[0, -1.05, 0]}>
      <primitive object={cloned} />
    </group>
  )
}
