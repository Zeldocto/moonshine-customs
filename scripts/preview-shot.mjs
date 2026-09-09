/**
 * preview-shot.mjs — screenshot loop for the 3D Mario preview.
 *
 *   npm i -D playwright && npx playwright install chromium
 *   npm run dev                       # in another terminal
 *   node scripts/preview-shot.mjs                       # default look, 5 angles
 *   node scripts/preview-shot.mjs out "skin=mario_cap:40,170,60"   # with an override
 *   node scripts/preview-shot.mjs out "raw=1"           # stock .glb, no skin code
 *
 * Opens /preview-test (a dev-only route, see src/pages/PreviewTest.tsx), waits
 * for the <canvas> plus a fixed delay so WebGL settles, and writes PNGs to
 * preview-shots/<out>/. Builds preview-shots/<out>/_compare.png next to
 * "example mario.png" for a quick eyeball.
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.argv[2] || 'run'
const EXTRA = process.argv[3] || ''
const BASE = process.env.PREVIEW_URL || 'http://localhost:5173/moonshine-customs/preview-test'
const REF = resolve(root, 'example mario.png')
const dir = resolve(root, 'preview-shots', OUT)
mkdirSync(dir, { recursive: true })

const angles = [
  { name: 'ref-match', q: 'angle=-4&elev=9&dist=3.5' },
  { name: 'front', q: 'angle=6&elev=6&dist=4.2' },
  { name: 'left', q: 'angle=-40&elev=6&dist=4.2' },
  { name: 'right', q: 'angle=45&elev=6&dist=4.2' },
  { name: 'face', q: 'angle=8&elev=4&dist=2.7' },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 980, height: 840 }, deviceScaleFactor: 2 })
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

if (existsSync(REF)) {
  const { default: sharp } = await import('sharp').catch(() => ({ default: null }))
  if (sharp) {
    const H = 840
    const ref = await sharp(REF).resize({ height: H }).toBuffer()
    const mine = await sharp(resolve(dir, 'ref-match.png')).resize({ height: H }).toBuffer()
    const rw = (await sharp(ref).metadata()).width
    const mw = (await sharp(mine).metadata()).width
    await sharp({ create: { width: rw + mw + 24, height: H, channels: 3, background: '#fff' } })
      .composite([{ input: ref, left: 0, top: 0 }, { input: mine, left: rw + 24, top: 0 }])
      .png()
      .toFile(resolve(dir, '_compare.png'))
    console.log('compare ->', resolve(dir, '_compare.png'))
  }
}
