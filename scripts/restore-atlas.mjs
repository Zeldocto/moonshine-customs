/**
 * restore-atlas.mjs — post-process public/models/mario_fludd.glb so the 3D
 * preview shows Mario in his true colors.
 *
 * BACKGROUND
 * ----------
 * The original build-model.py rewrote Mario's texture atlas so every tinted
 * region carried luminance only, with hue coming from a per-slot baseColor.
 * That destroyed the original pixels, so any misclassification was permanent:
 * the shine shirt lost its cyan base, and a grayed region bled white onto
 * Mario's nose.
 *
 * NEW APPROACH
 * ------------
 * Keep Sunshine's original atlas (public/models/Mario/H_ma_new_main_s3tc.png)
 * byte-for-byte. A slot with no skin override then renders exactly what the
 * game drew. Recoloring happens at runtime in a hue-shift shader
 * (src/components/preview/applySkin.ts + SLOT_TINT in modelConfig.ts), which
 * only touches texels matching a slot's stock hue and can't break the face,
 * the cap's "M" or the yellow shine sprites.
 *
 * This script does the two edits that the geometry split in build-model.py
 * doesn't need to be re-run for:
 *   1. replace the embedded luminance atlas with the original RGB atlas
 *   2. reset baseColorFactor to white on every mesh that samples it
 *
 * It is idempotent. Run after regenerating the .glb from build-model.py:
 *   npm i -D @gltf-transform/core sharp
 *   node scripts/restore-atlas.mjs
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GLB = resolve(root, 'public/models/mario_fludd.glb')
const ORIG_ATLAS = resolve(root, 'public/models/Mario/H_ma_new_main_s3tc.png')

const rgb = await sharp(ORIG_ATLAS).removeAlpha().png().toBuffer()

const io = new NodeIO()
const doc = await io.read(GLB)
const textures = doc.getRoot().listTextures()

// The head atlas is the only 256x256 texture shared by the body meshes.
let atlasTex = null
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const t = prim.getMaterial()?.getBaseColorTexture()
    if (t && /cap|shirt|overalls|shoes/.test(mesh.getName())) atlasTex = t
  }
}
if (!atlasTex) atlasTex = textures[0]

console.log('atlas texture: %d bytes -> %d bytes (original)', atlasTex.getImage().byteLength, rgb.byteLength)
atlasTex.setImage(new Uint8Array(rgb))
atlasTex.setMimeType('image/png')

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial()
    if (mat?.getBaseColorTexture() === atlasTex) {
      const before = mat.getBaseColorFactor()
      if (before.some((c, i) => (i < 3 ? c !== 1 : false))) {
        mat.setBaseColorFactor([1, 1, 1, before[3]])
        console.log('  %s baseColor %s -> 1,1,1', mesh.getName(), before.slice(0, 3).map((x) => x.toFixed(2)))
      }
    }
  }
}

await io.write(GLB, doc)
console.log('wrote', GLB)
