/**
 * fludd-shot.mjs — screenshot loop for FLUDD on Mario's back.
 * Same idea as preview-shot.mjs but angled to show the pack: behind + sides.
 *
 *   node scripts/fludd-shot.mjs <out> "<extra query>"
 *   node scripts/fludd-shot.mjs raw   "raw=1"
 *   node scripts/fludd-shot.mjs tint  "skin=fludd_metal:20,180,90"
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.argv[2] || 'fludd'
const EXTRA = process.argv[3] || ''
const BASE = process.env.PREVIEW_URL || 'http://localhost:5173/moonshine-customs/preview-test'
const dir = resolve(root, 'preview-shots', OUT)
mkdirSync(dir, { recursive: true })

const angles = [
  { name: 'behind',       q: 'angle=180&elev=8&dist=4.0' },
  { name: 'behind-close',  q: 'angle=185&elev=14&dist=2.9' },
  { name: 'back-left',     q: 'angle=225&elev=10&dist=3.6' },
  { name: 'back-right',    q: 'angle=135&elev=10&dist=3.6' },
  { name: 'side-left',     q: 'angle=270&elev=6&dist=3.8' },
  { name: 'front',         q: 'angle=6&elev=6&dist=4.2' },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 })
page.on('console', (m) => m.type() === 'error' && console.log('  [console]', m.text()))
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

for (const a of angles) {
  await page.goto(`${BASE}?${a.q}${EXTRA ? '&' + EXTRA : ''}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(3500)
  await page.screenshot({ path: resolve(dir, `${a.name}.png`) })
  console.log('saved', a.name)
}
await browser.close()
