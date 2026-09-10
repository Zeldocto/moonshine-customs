/** @type {import('tailwindcss').Config} */

/**
 * Every palette entry resolves through a CSS variable holding an "R G B"
 * triple, so `.dark` on <html> can repoint the whole UI without a single
 * `dark:` variant in the markup. The `<alpha-value>` placeholder keeps the
 * opacity modifiers (`bg-lagoon/12`, `border-ink/15`) working.
 *
 * Light and dark values live together in src/index.css.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sand: token('sand'),
        sandDeep: token('sand-deep'),
        shell: token('shell'),
        ink: token('ink'),
        inkSoft: token('ink-soft'),
        lagoon: token('lagoon'),
        lagoonDeep: token('lagoon-deep'),
        /** Teal used as *text* — flips light on dark, unlike lagoonDeep. */
        accent: token('accent'),
        shine: token('shine'),
        goop: token('goop'),
        coral: token('coral'),
        /** Readable coral for text on a coral-tinted panel. */
        coralDeep: token('coral-deep'),
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['Rubik', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 0 var(--edge), 0 10px 24px -18px var(--drop)',
        lift: '0 2px 0 0 var(--edge), 0 18px 34px -20px var(--drop-strong)',
      },
      borderRadius: {
        chip: '14px',
      },
    },
  },
  plugins: [],
}
