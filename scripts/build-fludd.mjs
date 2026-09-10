/**
 * build-fludd.mjs — re-split the FLUDD pack inside mario_fludd.glb.
 *
 * Why this is separate from build-model.py: that script only runs in the
 * Claude sandbox (it needs /home/claude helper modules and a glb writer we
 * don't have locally). This does the FLUDD half locally with @gltf-transform.
 *
 *   1. scripts/fludd_parts.json is produced by scripts/build_fludd_parts.py
 *      (parse watergun_item.dae, apply build-model.py's exact FLUDD transform,
 *       classify mesh0 triangles by the texel they sample, split into slots).
 *   2. This loads the current glb, drops the single `fludd_paint` mesh, and
 *      adds one mesh per FLUDD slot:
 *        fludd_paint / fludd_metal / fludd_straps  -> share the UNTOUCHED
 *          H_watergun_main_s3tc_item.png atlas, recolored at runtime by the
 *          same hue-shift shader Mario uses (applySkin.ts + SLOT_TINT).
 *        fludd_model_tank -> the vertex-blue water sphere, plain-color path.
 *        fludd_trim       -> the blue accent ring, no slot, always stock.
 *   3. Mario's meshes are copied through untouched.
 *
 *   node scripts/build-fludd.mjs
 */
import { NodeIO } from '@gltf-transform/core'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GLB = resolve(root, 'public/models/mario_fludd.glb')
const TEX = resolve(root, 'public/models/FLUDD/H_watergun_main_s3tc_item.png')
const PARTS = JSON.parse(readFileSync(resolve(root, 'scripts/fludd_parts.json'), 'utf8'))

const io = new NodeIO()
const doc = await io.read(GLB)
const r = doc.getRoot()
const scene = r.listScenes()[0]
const buffer = r.listBuffers()[0]

// Copy PBR factors off an existing Mario material so lighting matches.
const ref = r.listMaterials().find((m) => m.getName() === 'mario_overalls_mat') ?? r.listMaterials()[0]
const REF_METALLIC = ref.getMetallicFactor()
const REF_ROUGH = ref.getRoughnessFactor()

// --- drop any existing FLUDD meshes (idempotent: safe to re-run) ------------
for (const node of r.listNodes()) {
  if (node.getName().startsWith('fludd_')) {
    const mesh = node.getMesh()
    const mats = new Set(mesh?.listPrimitives().map((p) => p.getMaterial()).filter(Boolean))
    node.dispose()
    mesh?.dispose()
    for (const m of mats) m.dispose()
  }
}

// --- shared FLUDD atlas (kept exactly as Sunshine drew it) -----------------
const atlas = doc
  .createTexture('fludd_item_atlas')
  .setImage(new Uint8Array(readFileSync(TEX)))
  .setMimeType('image/png')

const f32 = (a) => new Float32Array(a)
const u32 = (a) => new Uint32Array(a)

for (const part of PARTS) {
  const pos = doc.createAccessor(`${part.name}_pos`).setType('VEC3').setArray(f32(part.positions)).setBuffer(buffer)
  const nrm = doc.createAccessor(`${part.name}_nrm`).setType('VEC3').setArray(f32(part.normals)).setBuffer(buffer)
  const idx = doc.createAccessor(`${part.name}_idx`).setType('SCALAR').setArray(u32(part.indices)).setBuffer(buffer)

  const prim = doc.createPrimitive().setAttribute('POSITION', pos).setAttribute('NORMAL', nrm).setIndices(idx)

  const mat = doc
    .createMaterial(`${part.name}_mat`)
    .setRoughnessFactor(REF_ROUGH)
    .setMetallicFactor(part.name === 'fludd_metal' ? Math.max(REF_METALLIC, 0.5) : REF_METALLIC)
    .setDoubleSided(true)

  if (part.texture && part.uvs.length) {
    const uv = doc.createAccessor(`${part.name}_uv`).setType('VEC2').setArray(f32(part.uvs)).setBuffer(buffer)
    prim.setAttribute('TEXCOORD_0', uv)
    mat.setBaseColorTexture(atlas)
    mat.setBaseColorFactor([1, 1, 1, 1]) // texture carries the stock look
  } else {
    // water sphere: no atlas, translucent, color comes from the mean vertex-blue
    const [cr, cg, cb] = part.meanRGB
    mat.setBaseColorFactor([cr, cg, cb, 0.7]).setAlphaMode('BLEND')
  }

  prim.setMaterial(mat)
  const mesh = doc.createMesh(part.name).addPrimitive(prim)
  scene.addChild(doc.createNode(part.name).setMesh(mesh))
}

await io.write(GLB, doc)
console.log('wrote', GLB)
for (const p of PARTS) console.log('  +', p.name, `(${p.indices.length / 3} tris)`)
