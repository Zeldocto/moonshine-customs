import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Shared with the boot script in index.html — keep the two in sync. */
export const THEME_STORAGE_KEY = 'moonshine:theme'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  setTheme: (next: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** What the boot script already put on <html>, so the first render matches it. */
function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function storedTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return raw === 'dark' || raw === 'light' ? raw : null
  } catch {
    // Private mode, or site data blocked. Fall back to the system setting.
    return null
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  // Apply to <html>, and animate the swap only for this one frame — a standing
  // transition on every element would make normal hovers feel sluggish.
  const applyTheme = useCallback((next: Theme, animate: boolean) => {
    const root = document.documentElement
    if (animate) {
      root.classList.add('theme-switching')
      window.setTimeout(() => root.classList.remove('theme-switching'), 220)
    }
    root.classList.toggle('dark', next === 'dark')
    setThemeState(next)
  }, [])

  const setTheme = useCallback(
    (next: Theme) => {
      applyTheme(next, true)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Nothing to do — the choice just will not survive a reload.
      }
    },
    [applyTheme],
  )

  const toggle = useCallback(() => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  // Follow the OS only while the visitor has not picked a side themselves.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = () => {
      if (!storedTheme()) applyTheme(systemTheme(), true)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [applyTheme])

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
