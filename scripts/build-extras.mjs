/**
 * build-extras.mjs — run every local post-process on mario_fludd.glb, in order.
 *
 * scripts/build-model.py (the cloud-only step) emits FLUDD as one flat mesh and
 * the sunglasses as one see-through mesh. These patchers re-split them:
 *   - build_fludd_parts.py  + build-fludd.mjs   → FLUDD per Moonshine slot
 *   - build_glasses_parts.py + build-glasses.mjs → sunglasses frame vs lens
 * Each is idempotent and only touches its own nodes, so this is safe to re-run.
 *
 *   npm run model:extras
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const run = (cmd, args) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { stdio: 'inherit', cwd: root })
}

const py = process.env.PYTHON || 'python'
run(py, ['scripts/build_fludd_parts.py'])
run('node', ['scripts/build-fludd.mjs'])
run(py, ['scripts/build_glasses_parts.py'])
run('node', ['scripts/build-glasses.mjs'])
console.log('\nmario_fludd.glb patched.')
