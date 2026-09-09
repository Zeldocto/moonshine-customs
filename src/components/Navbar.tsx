import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../lib/errors'
import { Avatar } from './Avatar'

const LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/upload', label: 'Upload' },
  { to: '/community', label: 'Community' },
  { to: '/about', label: 'About' },
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'rounded-full px-3.5 py-2 font-display text-lg font-bold no-underline transition-colors',
      isActive ? 'bg-lagoon/12 text-lagoonDeep' : 'text-ink hover:bg-ink/5',
    ].join(' ')

  return (
    <header className="sticky top-0 z-30 border-b border-sandDeep bg-sand/92 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3" aria-label="Main">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <ShineMark />
          <span className="font-display text-2xl font-extrabold leading-none text-ink">
            Moonshine <span className="text-lagoonDeep">Skins</span>
          </span>
        </Link>

        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-2 md:flex">
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

        <button
          type="button"
          className="btn-ghost btn-sm ml-auto md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </nav>

      {open && (
        <div id="mobile-nav" className="border-t border-sandDeep bg-sand px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={linkClass} onClick={() => setOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
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

/** Shine sprite, abstracted into a simple mark. */
function ShineMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 2 l3.6 8.2 L28 12 l-6.4 5.6 L23.4 26 L16 21.6 L8.6 26 l1.8 -8.4 L4 12 l8.4 -1.8 z"
        fill="#FFC53D"
        stroke="#14323C"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="15" r="3.4" fill="#0FA3B1" />
    </svg>
  )
}
