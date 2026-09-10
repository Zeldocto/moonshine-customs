import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../lib/errors'
import { Avatar } from './Avatar'

/** `href` marks a link that leaves the site (opens in a new tab). */
const LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/upload', label: 'Upload' },
  { to: '/community', label: 'Community' },
  { to: '/about', label: 'About' },
  { href: 'https://github.com/panther03/moonshine/releases/', label: 'Moonshine' },
]

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    try {
      await signOut()
      notify('Signed out.', 'success')
      navigate('/')
    } catch (error) {
      notify(friendlyError(error, 'Could not sign out.'), 'error')
    }
  }

  const baseLink =
    'rounded-full px-3.5 py-2 font-display text-lg font-bold no-underline transition-colors'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [baseLink, isActive ? 'bg-lagoon/12 text-accent' : 'text-ink hover:bg-ink/5'].join(' ')

  const navItems = (onNavigate?: () => void) =>
    LINKS.map((link) =>
      link.href ? (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            className={`${baseLink} inline-flex items-center gap-1 text-ink hover:bg-ink/5 hover:no-underline`}
            onClick={onNavigate}
          >
            {link.label}
            <ExternalMark />
          </a>
        </li>
      ) : (
        <li key={link.to}>
          <NavLink to={link.to!} className={linkClass} onClick={onNavigate}>
            {link.label}
          </NavLink>
        </li>
      ),
    )

  return (
    <header className="sticky top-0 z-30 border-b border-sandDeep bg-sand/92 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3" aria-label="Main">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <ShineMark />
          <span className="font-display text-2xl font-extrabold leading-none text-ink">
            Moonshine <span className="text-accent">Skins</span>
          </span>
        </Link>

        <ul className="ml-4 hidden items-center gap-1 lg:flex">{navItems()}</ul>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {user && profile ? (
            <>
              <Link
                to={`/profile/${profile.username}`}
                className="flex items-center gap-2 rounded-full px-2 py-1 font-display text-lg font-bold text-ink no-underline hover:bg-ink/5"
              >
                <Avatar profile={profile} size={30} />
                {profile.username}
              </Link>
              <button type="button" onClick={handleSignOut} className="btn-ghost btn-sm">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Join
              </Link>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" className="border-t border-sandDeep bg-sand px-4 py-3 lg:hidden">
          <ul className="flex flex-col gap-1">{navItems(() => setOpen(false))}</ul>
          <div className="mt-3 flex gap-2 border-t border-sandDeep pt-3">
            {user && profile ? (
              <>
                <Link
                  to={`/profile/${profile.username}`}
                  className="btn-ghost btn-sm"
                  onClick={() => setOpen(false)}
                >
                  My profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    void handleSignOut()
                  }}
                  className="btn-ghost btn-sm"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary btn-sm" onClick={() => setOpen(false)}>
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/15 bg-shell text-ink transition-colors hover:border-ink/35"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.9" />
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2" />
        <path d="M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
      </g>
    </svg>
  )
}

/** Small arrow marking a link that leaves the site. */
function ExternalMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path
        d="M6 3h7v7M13 3 4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The Shine sprite from public/. BASE_URL keeps it pointing at the right place
 * under the GitHub Pages subpath. Decorative — the wordmark beside it carries
 * the name — so it is hidden from screen readers.
 */
function ShineMark() {
  return (
    <img
      src={`${import.meta.env.BASE_URL}moonshine.png`}
      alt=""
      aria-hidden="true"
      width={34}
      height={34}
      className="h-[34px] w-[34px] shrink-0 select-none"
      draggable={false}
    />
  )
}
