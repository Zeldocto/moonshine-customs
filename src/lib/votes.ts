import { supabase } from './supabase'

export type VoteValue = 1 | -1

/**
 * The client writes its own row in skin_votes and nothing else. Totals are
 * recalculated by a database trigger, so a tampered request can at worst
 * change that one user's single ballot.
 */
export async function getMyVote(skinId: string, userId: string): Promise<VoteValue | 0> {
  const { data, error } = await supabase
    .from('skin_votes')
    .select('vote')
    .eq('skin_id', skinId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.vote as VoteValue) ?? 0
}

export async function getMyVotes(skinIds: string[], userId: string): Promise<Record<string, VoteValue>> {
  if (skinIds.length === 0) return {}
  const { data, error } = await supabase
    .from('skin_votes')
    .select('skin_id, vote')
    .eq('user_id', userId)
    .in('skin_id', skinIds)
  if (error) throw error
  return Object.fromEntries((data ?? []).map((r) => [r.skin_id, r.vote as VoteValue]))
}

/**
 * Voting goes through a database function rather than an upsert.
 *
 * PostgREST's upsert compiles to ON CONFLICT DO UPDATE writing skin_id, user_id
 * and vote, but only `vote` was ever granted for UPDATE, so changing a vote was
 * rejected on a column privilege check. cast_vote() also keeps the "no voting on
 * your own skin" rule server-side, where a crafted request cannot skip it.
 *
 * Returns the skin's new score so the caller can settle any optimistic update.
 */
export async function setVote(skinId: string, _userId: string, vote: VoteValue): Promise<number> {
  const { data, error } = await supabase.rpc('cast_vote', {
    p_skin_id: skinId,
    p_vote: vote,
  })
  if (error) throw error
  return data as number
}

export async function clearVote(skinId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('skin_votes')
    .delete()
    .eq('skin_id', skinId)
    .eq('user_id', userId)
  if (error) throw error
}
