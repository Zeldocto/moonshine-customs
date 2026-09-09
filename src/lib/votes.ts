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

export async function setVote(skinId: string, userId: string, vote: VoteValue): Promise<void> {
  const { error } = await supabase
    .from('skin_votes')
    .upsert({ skin_id: skinId, user_id: userId, vote }, { onConflict: 'skin_id,user_id' })
  if (error) throw error
}

export async function clearVote(skinId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('skin_votes')
    .delete()
    .eq('skin_id', skinId)
    .eq('user_id', userId)
  if (error) throw error
}
