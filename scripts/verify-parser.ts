/**
 * Sanity check: run the real parser over a real susamune.ini.
 *   npx esbuild scripts/verify-parser.ts --bundle --platform=node --format=esm --outfile=/tmp/v.mjs && node /tmp/v.mjs <file>
 */
import { readFileSync } from 'node:fs'
import { parseMoonshineIni } from '../src/lib/skin-format/parser'
import { buildSkinFile } from '../src/lib/skin-format/serializer'

const path = process.argv[2]
const text = readFileSync(path, 'utf8')
const { candidates, warnings } = parseMoonshineIni(text)

console.log('warnings:', warnings)
for (const c of candidates) {
  console.log(`\n[${c.section}] region=${c.regionLabel} customised=${c.customisedCount}`)
  console.log('  enabled:', c.data.enabled)
  console.log('  slots:', Object.entries(c.data.slots).map(([k, v]) => `${k}=${v.join(',')}`).join(' '))
}

console.log('\n--- generated download file ---')
console.log(buildSkinFile(candidates[0].data, { name: 'Test Skin', author: 'zeldocto', modVersion: '1.0' }))
