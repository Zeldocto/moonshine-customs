import type { Profile } from '../types/skin'

interface AvatarProps {
  profile: Pick<Profile, 'username' | 'avatar_url'> | { username: string; avatar_url: string | null }
  size?: number
}

/** Falls back to an initial on a colour derived from the name. */
export function Avatar({ profile, size = 40 }: AvatarProps) {
  const hue = [...profile.username].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360

  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={`${profile.username}'s avatar`}
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full border-2 border-shell object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full border-2 border-shell font-display font-bold text-ink"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `hsl(${hue} 68% 78%)`,
      }}
    >
      {profile.username.charAt(0).toUpperCase()}
    </span>
  )
}
