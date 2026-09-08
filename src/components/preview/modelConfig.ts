/**
 * ─────────────────────────────────────────────────────────────────────────
 *  WHERE TO PLUG IN THE REAL MARIO + FLUDD MODEL
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  1. Export the rip from The Models Resource as .glb (Blender: File ▸
 *     Export ▸ glTF 2.0 Binary). Keep it under ~4 MB — decimate and downscale
 *     textures if needed, it is a preview, not the game.
 *
 *  2. Drop it at   public/models/mario-fludd.glb
 *
 *  3. Set MARIO_MODEL_URL below to the commented-out value.
 *
 *  4. Fill in MATERIAL_MATCHERS so each skin slot knows which meshes or
 *     materials it tints. Open the .glb in https://gltf-viewer.donmccurdy.com
 *     to read the real names.
 *
 *  Nothing else in the app needs to change: applySkinToModel() walks whatever
 *  object tree it is given and uses this table.
 *
 *  ⚠ Licensing: model rips of Nintendo assets are not ours to redistribute.
 *  Check what you are allowed to host before committing a .glb to a public
 *  repository. The placeholder model below is original geometry and is safe.
 */

export const MARIO_MODEL_URL: string | null = null
// export const MARIO_MODEL_URL: string | null = `${import.meta.env.BASE_URL}models/mario-fludd.glb`

/**
 * slot id -> patterns matched (case-insensitively) against each mesh's name
 * and its material's name. First matching slot wins.
 */
export const MATERIAL_MATCHERS: Record<string, string[]> = {
  mario_cap: ['cap', 'hat'],
  mario_shirt: ['shirt', 'body_red', 'torso'],
  mario_overalls: ['overall', 'dungaree', 'pants'],
  mario_gloves: ['glove', 'hand'],
  mario_shoes: ['shoe', 'boot'],
  mario_sunglasses: ['sunglass', 'shades', 'lens'],
  mario_sunshine_shirt: ['shineshirt', 'shine_shirt', 'altshirt'],
  fludd_paint: ['fludd_body', 'fludd_paint', 'pack'],
  fludd_metal: ['fludd_metal', 'metal', 'chrome'],
  fludd_straps: ['strap', 'belt', 'harness'],
  fludd_model_tank: ['tank', 'bottle'],
  fludd_spray_nozzle: ['spray', 'squirt'],
  fludd_hover_nozzle: ['hover'],
  fludd_rocket_nozzle: ['rocket'],
  fludd_turbo_nozzle: ['turbo'],
  fludd_water: ['water'],
  fludd_water_highlight: ['water_hi', 'waterhighlight', 'foam'],
}
