import * as THREE from 'three'
import { SKIN_SLOTS, SLOT_BY_ID, isSlotEnabled } from '../../lib/skin-format/slots'
import type { SkinData } from '../../types/skin'
import { MATERIAL_MATCHERS, SLOT_TINT } from './modelConfig'

/**
 * The one function that connects skin data to geometry.
 *
 * Everything about "which color goes where" lives here and in
 * modelConfig.ts. The viewer components never touch colors directly, so
 * swapping the placeholder for the real model — or reacting to a change in
 * the Moonshine format — is a change to these two files only.
 *
 * The real model keeps Sunshine's *original* texture atlas untouched. Recolor
 * happens in a shader patch (installTint) that shifts hue only on texels that
 * match a slot's stock color, preserving luminance. A slot with no override
 * leaves every texel exactly as the game drew it — so the face, the shine
 * sprites and the cap's "M" can never be broken by a misclassification.
 *
 * The placeholder model has no texture; there we fall back to a plain
 * material.color multiply, which is all its flat geometry needs.
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
    const override = enabled ? (skin.slots[slot.id] ?? null) : null

    for (const material of materialsOf(mesh)) {
      const target = material as THREE.MeshStandardMaterial
      if (!target.color) continue

      const tint = SLOT_TINT[slotId]

      if (tint && target.map) {
        // Shader-based recolor on the untouched atlas.
        const uniforms = installTint(target, tint)
        uniforms.uEnabled.value = override ? 1 : 0
        if (override) {
          uniforms.uTint.value.setRGB(
            override[0] / 255,
            override[1] / 255,
            override[2] / 255,
            THREE.SRGBColorSpace,
          )
        }
        continue
      }

      // Placeholder model (no texture) — or a slot with no tint profile.
      if (!target.userData.stockColor) {
        target.userData.stockColor = target.color.clone()
      }
      if (override) {
        const [r, g, b] = override
        target.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
      } else {
        target.color.copy(target.userData.stockColor as THREE.Color)
      }
      target.needsUpdate = true
    }
  })
}

interface TintUniforms {
  uEnabled: { value: number }
  uTint: { value: THREE.Color }
  uRefHue: { value: number }
  uHueTol: { value: number }
  uSatMin: { value: number }
  uRefLum: { value: number }
  uLumGain: { value: number }
}

/**
 * Patch a MeshStandardMaterial so that, when uEnabled is on, texels whose hue
 * is within uHueTol of the slot's stock hue are re-tinted to uTint at their
 * own luminance. Everything else — different-hue detail, near-grays, the whole
 * texture when uEnabled is off — passes through unchanged.
 */
function installTint(mat: THREE.MeshStandardMaterial, profile: (typeof SLOT_TINT)[string]): TintUniforms {
  const existing = mat.userData.tintUniforms as TintUniforms | undefined
  if (existing) return existing

  const uniforms: TintUniforms = {
    uEnabled: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uRefHue: { value: profile.hue },
    uHueTol: { value: profile.hueTol },
    uSatMin: { value: profile.satMin },
    uRefLum: { value: profile.refLum },
    uLumGain: { value: profile.lumGain },
  }
  mat.userData.tintUniforms = uniforms

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        /* glsl */ `
        uniform float uEnabled;
        uniform vec3  uTint;
        uniform float uRefHue;
        uniform float uHueTol;
        uniform float uSatMin;
        uniform float uRefLum;
        uniform float uLumGain;

        float slotHue(vec3 c) {
          float mx = max(c.r, max(c.g, c.b));
          float mn = min(c.r, min(c.g, c.b));
          float d = mx - mn;
          if (d < 1e-4) return 0.0;
          float h;
          if (mx == c.r)      h = mod((c.g - c.b) / d, 6.0);
          else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
          else                h = (c.r - c.g) / d + 4.0;
          return h / 6.0;
        }
        void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>
        if (uEnabled > 0.5) {
          vec3 tex = sampledDiffuseColor.rgb;
          float mx = max(tex.r, max(tex.g, tex.b));
          float mn = min(tex.r, min(tex.g, tex.b));
          float sat = mx - mn;
          float hue = slotHue(tex);
          float dh = abs(hue - uRefHue);
          dh = min(dh, 1.0 - dh);
          float match = step(uSatMin, sat) * (1.0 - step(uHueTol, dh));
          if (match > 0.5) {
            float lum = dot(tex, vec3(0.299, 0.587, 0.114));
            vec3 tinted = uTint * clamp(lum / uRefLum * uLumGain, 0.0, 1.6);
            diffuseColor.rgb = tinted;
          }
        }
        `,
      )
  }
  mat.needsUpdate = true
  return uniforms
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
