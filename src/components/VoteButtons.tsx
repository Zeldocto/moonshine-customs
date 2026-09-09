import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { clearVote, getMyVote, setVote, type VoteValue } from '../lib/votes'
import { friendlyError } from '../lib/errors'
import { formatScore } from '../utils/format'

interface VoteButtonsProps {
  skinId: string
  ownerId: string
  score: number
  size?: 'sm' | 'lg'
}

/**
 * Optimistic: the arrows and score update immediately, then reconcile with
 * whatever the database says. The displayed delta is computed from the user's
 * own previous vote, which is how switching up→down moves the score by two.
 */
export function VoteButtons({ skinId, ownerId, score, size = 'sm' }: VoteButtonsProps) {
  const { user } = useAuth()
  const { notify } = useToast()
  const [myVote, setMyVote] = useState<VoteValue | 0>(0)
  const [delta, setDelta] = useState(0)
  const [busy, setBusy] = useState(false)

  const isOwner = user?.id === ownerId

  useEffect(() => {
    let active = true
    if (!user || isOwner) {
      setMyVote(0)
      return
    }
    getMyVote(skinId, user.id)
      .then((vote) => active && setMyVote(vote))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [skinId, user, isOwner])

  async function cast(next: VoteValue) {
    if (!user) {
      notify('Sign in to vote on skins.', 'info')
      return
    }
    if (isOwner) {
      notify('You cannot vote on your own skin.', 'info')
      return
    }

    const previous = myVote
    const target: VoteValue | 0 = previous === next ? 0 : next
    setMyVote(target)
    setDelta((d) => d + (target - previous))
    setBusy(true)

    try {
      if (target === 0) await clearVote(skinId, user.id)
      else await setVote(skinId, user.id, target)
    } catch (error) {
      setMyVote(previous)
      setDelta((d) => d - (target - previous))
      notify(friendlyError(error, 'Your vote did not save.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const total = score + delta
  const box = size === 'lg' ? 'h-11 w-11 text-xl' : 'h-9 w-9 text-base'

  const arrow = (active: boolean, tone: 'up' | 'down') =>
    [
      'inline-flex items-center justify-center rounded-full border-2 font-bold transition-colors',
      box,
      active
        ? tone === 'up'
          ? 'border-lagoonDeep bg-lagoon text-white'
          : 'border-goop bg-goop text-white'
        : 'border-ink/15 bg-shell text-inkSoft hover:border-ink/40',
      isOwner ? 'cursor-not-allowed opacity-60' : '',
    ].join(' ')

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={arrow(myVote === 1, 'up')}
        onClick={() => void cast(1)}
        disabled={busy || isOwner}
        aria-pressed={myVote === 1}
        aria-label="Upvote this skin"
        title={isOwner ? 'You cannot vote on your own skin' : 'Upvote'}
      >
        ▲
      </button>

      <span
        className={`min-w-[3ch] text-center font-display font-bold ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}
        aria-label={`Score ${formatScore(total)}`}
      >
        {formatScore(total)}
      </span>

      <button
        type="button"
        className={arrow(myVote === -1, 'down')}
        onClick={() => void cast(-1)}
        disabled={busy || isOwner}
        aria-pressed={myVote === -1}
        aria-label="Downvote this skin"
        title={isOwner ? 'You cannot vote on your own skin' : 'Downvote'}
      >
        ▼
      </button>

      {!user && (
        <Link to="/login" className="text-sm text-inkSoft">
          Sign in to vote
        </Link>
      )}
    </div>
  )
}
