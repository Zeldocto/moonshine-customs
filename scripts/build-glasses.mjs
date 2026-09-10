/**
 * build-glasses.mjs — re-split Mario's sunglasses inside mario_fludd.glb.
 *
 * Same reason as build-fludd.mjs: build-model.py can't run locally and it
 * merged the frame + lens OBJ groups into one see-through mesh.
 *
 *   1. scripts/build_glasses_parts.py writes scripts/glasses_parts.json
 *      (frame group + lens group, each with its own texture, transformed to
 *       match build-model.py).
 *   2. this drops the old `mario_sunglasses` mesh and adds:
 *        mario_sunglasses_frame — H_mario_sunglass_flame_ia4.png, alphaMode MASK
 *          so the black frame is opaque and the lens hole is a clean cutout.
 *        mario_sunglasses_lens  — vertexColors_glass.png, alphaMode BLEND at
 *          ~0.8 so the tinted lens reads as glass, a bit more solid than before.
 *      Both mesh names contain "mario_sunglasses" so both still match the
 *      mario_sunglasses skin slot and recolour together.
 *
 *   node scripts/build-glasses.mjs
 */
import { NodeIO } from '@gltf-transform/core'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GLB = resolve(root, 'public/models/mario_fludd.glb')
const PARTS = JSON.parse(readFileSync(resolve(root, 'scripts/glasses_parts.json'), 'utf8'))
// frame mask lives next to this script (written by build_glasses_parts.py); the
// lens texture is a stock rip in public/models/Mario/.
const texPath = (file) =>
  file === 'mario_sunglass_frame_mask.png'
    ? resolve(root, 'scripts', file)
    : resolve(root, 'public/models/Mario', file)

const io = new NodeIO()
const doc = await io.read(GLB)
const r = doc.getRoot()
const scene = r.listScenes()[0]
const buffer = r.listBuffers()[0]

// drop any existing sunglasses meshes (idempotent)
for (const node of r.listNodes()) {
  if (node.getName().startsWith('mario_sunglasses')) {
    const mesh = node.getMesh()
    const mats = new Set(mesh?.listPrimitives().map((p) => p.getMaterial()).filter(Boolean))
    node.dispose()
    mesh?.dispose()
    for (const m of mats) m.dispose()
  }
}

const f32 = (a) => new Float32Array(a)
const u32 = (a) => new Uint32Array(a)
const texCache = new Map()
const tex = (file) => {
  if (!texCache.has(file)) {
    texCache.set(
      file,
      doc.createTexture(file).setImage(new Uint8Array(readFileSync(texPath(file)))).setMimeType('image/png'),
    )
  }
  return texCache.get(file)
}

for (const part of PARTS) {
  const pos = doc.createAccessor(`${part.name}_pos`).setType('VEC3').setArray(f32(part.positions)).setBuffer(buffer)
  const nrm = doc.createAccessor(`${part.name}_nrm`).setType('VEC3').setArray(f32(part.normals)).setBuffer(buffer)
  const uv = doc.createAccessor(`${part.name}_uv`).setType('VEC2').setArray(f32(part.uvs)).setBuffer(buffer)
  const idx = doc.createAccessor(`${part.name}_idx`).setType('SCALAR').setArray(u32(part.indices)).setBuffer(buffer)

  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', pos)
    .setAttribute('NORMAL', nrm)
    .setAttribute('TEXCOORD_0', uv)
    .setIndices(idx)

  const mat = doc.createMaterial(`${part.name}_mat`).setDoubleSided(true).setRoughnessFactor(0.4).setMetallicFactor(0)
  mat.setBaseColorTexture(tex(part.texture))

  if (part.kind === 'frame') {
    mat.setAlphaMode('MASK').setAlphaCutoff(0.5).setBaseColorFactor([1, 1, 1, 1])
  } else {
    // lens: translucent, a touch more solid than the old 0.62
    mat.setAlphaMode('BLEND').setBaseColorFactor([1, 1, 1, 0.83])
  }

  prim.setMaterial(mat)
  const mesh = doc.createMesh(part.name).addPrimitive(prim)
  scene.addChild(doc.createNode(part.name).setMesh(mesh))
}

await io.write(GLB, doc)
console.log('wrote', GLB)
for (const p of PARTS) console.log('  +', p.name, `(${p.kind}, ${p.indices.length / 3} tris)`)
