import * as THREE from 'three'
import { SKIN_SLOTS, SLOT_BY_ID, isSlotEnabled } from '../../lib/skin-format/slots'
import type { SkinData } from '../../types/skin'
import { MATERIAL_MATCHERS } from './modelConfig'

/**
 * The one function that connects skin data to geometry.
 *
 * Everything about "which colour goes where" lives here and in
 * modelConfig.ts. The viewer components never touch colours directly, so
 * swapping the placeholder for the real model — or reacting to a change in
 * the Moonshine format — is a change to these two files only.
 */
export function applySkinToModel(skin: SkinData, root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return

    const slotId = resolveSlot(mesh)
    if (!slotId) return

    const slot = SLOT_BY_ID[slotId]
    if (!slot) return

    const enabled = isSlotEnabled(slot, skin.enabled[slot.group] ?? 0)
    const [r, g, b] = enabled ? (skin.slots[slot.id] ?? slot.fallback) : slot.fallback

    for (const material of materialsOf(mesh)) {
      const target = material as THREE.MeshStandardMaterial
      if (!target.color) continue
      target.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
      target.needsUpdate = true
    }
  })
}

/** Explicit tag first (placeholder model), then name matching (imported model). */
function resolveSlot(mesh: THREE.Mesh): string | null {
  const tagged = mesh.userData?.skinSlot
  if (typeof tagged === 'string') return tagged

  const haystacks = [mesh.name, ...materialsOf(mesh).map((m) => m.name ?? '')]
    .join(' ')
    .toLowerCase()

  for (const slot of SKIN_SLOTS) {
    const patterns = MATERIAL_MATCHERS[slot.id] ?? []
    if (patterns.some((p) => haystacks.includes(p.toLowerCase()))) return slot.id
  }
  return null
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material]
}

/**
 * Materials are shared between instances of a loaded glTF, so tinting one
 * preview would tint every other one on the page. Call this once per mounted
 * model before applying a skin.
 */
export function isolateMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || mesh.userData.__materialsIsolated) return
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((m) => m.clone())
      : mesh.material.clone()
    mesh.userData.__materialsIsolated = true
  })
}
