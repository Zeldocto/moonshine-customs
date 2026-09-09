/**
 * Not every browser will hand us a WebGL context.
 *
 * LibreWolf ships with `webgl.disabled = true`, and Firefox's Resist
 * Fingerprinting mode blocks it too. Tor Browser prompts before allowing it.
 * In those browsers constructing a THREE.WebGLRenderer throws, which used to
 * surface as the generic "This part of the page stopped working" error card.
 *
 * Checking first lets us show the flat SVG preview instead, which needs no GPU
 * and still shows every colour in the skin.
 */
let cached: boolean | null = null

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached
  if (typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    cached = Boolean(gl)
    // Release the context immediately; browsers cap how many can be live.
    if (gl && 'getExtension' in gl) {
      ;(gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    cached = false
  }
  return cached
}
