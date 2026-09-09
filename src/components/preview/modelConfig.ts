/**
 * ─────────────────────────────────────────────────────────────────────────
 *  REAL MARIO + FLUDD MODEL — wired up
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  public/models/mario_fludd.glb is built from the .obj/.dae rips already in
 *  public/models/ by scripts/build-model.py. 137 KB, 2,696 triangles, four
 *  embedded textures (face atlas, eyes, mouth, sunglasses).
 *
 *  Every mesh is named after the colour slot it carries, so the matchers below
 *  are exact name matches rather than guesses. Face, eyes and mouth are
 *  deliberately unmatched — they keep their texture and are never tinted.
 *
 *  Model space: feet at y=0, 2.14 units tall, facing +Z.
 *
 *  ⚠ Licensing unchanged: these are ripped Nintendo assets. Hosting them on a
 *  public repo is your call, not the code's.
 */

export const MARIO_MODEL_URL: string | null = `${import.meta.env.BASE_URL}models/mario_fludd.glb`

/**
 * slot id -> patterns matched (case-insensitively) against each mesh's name
 * and its material's name. First matching slot wins.
 */
export const MATERIAL_MATCHERS: Record<string, string[]> = {
  mario_cap: ['mario_cap'],
  mario_shirt: ['mario_shirt'],
  mario_overalls: ['mario_overalls'],
  mario_gloves: ['mario_gloves'],
  mario_shoes: ['mario_shoes'],
  mario_sunglasses: ['mario_sunglasses'],
  fludd_paint: ['fludd_paint'],
  fludd_spray_nozzle: ['fludd_spray_nozzle'],

  // ---------------------------------------------------------------------
  // No geometry yet. Left in place so the RGB dropdown and parser keep
  // showing all 17 slots; they simply tint nothing until the meshes exist.
  //
  //   mario_sunshine_shirt — the shirt is one material; needs confirmation of
  //     whether Moonshine swaps the texture or only tints. If it only tints,
  //     point this at ['mario_shirt'] and let the shine toggle pick which of
  //     the two slots drives that mesh.
  //
  //   fludd_metal / straps / model_tank / hover_nozzle / rocket_nozzle /
  //   turbo_nozzle / water / water_highlight — every FLUDD .dae exports a
  //     single "Material1", so these regions can only be separated by UV mask
  //     against H_watergun_main_s3tc.png and vertexColors_body.png.
  // ---------------------------------------------------------------------
}
