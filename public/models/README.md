# Drop the Mario + FLUDD model here

The site ships with original placeholder geometry so every other feature works
today. To swap in the real thing:

1. Export a Mario + FLUDD model as **glTF binary** and save it here as
   `mario-fludd.glb`. Keep it under about 4 MB.
2. In `src/components/preview/modelConfig.ts`, uncomment the second
   `MARIO_MODEL_URL` line.
3. Fill in `MATERIAL_MATCHERS` in the same file with the real mesh or material
   names — open the `.glb` in <https://gltf-viewer.donmccurdy.com> to read them.

Nothing else changes: `applySkinToModel()` walks whatever object tree it gets.

**Before you commit a model:** rips of Nintendo's assets are not licensed for
redistribution. Hosting one in a public repository is a decision to make
deliberately, not by accident. If you would rather not, the placeholder stays.
