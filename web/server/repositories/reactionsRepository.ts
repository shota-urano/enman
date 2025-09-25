import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Reaction = {
  id: string
  transaction_id: string
  household_id?: string
  emoji: string
  user_id: string
  created_at: string
}

export const reactionsRepository = {
  async listByTransaction(
    householdId: string,
    transactionId: string,
  ): Promise<Reaction[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('reactions')
      .select('id, transaction_id, emoji, user_id, created_at')
      .eq('household_id', householdId)
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as Reaction[]
  },
  async findByUserAndTransaction(
    householdId: string,
    transactionId: string,
    userId: string,
  ): Promise<Reaction | null> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('reactions')
      .select('id, transaction_id, emoji, user_id, created_at')
      .eq('household_id', householdId)
      .eq('transaction_id', transactionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return (data as Reaction | null) ?? null
  },

  async create(
    householdId: string,
    userId: string,
    input: { transaction_id: string; emoji: string },
  ): Promise<Reaction> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('reactions')
      .insert({
        household_id: householdId,
        transaction_id: input.transaction_id,
        emoji: input.emoji,
        user_id: userId,
      })
      .select('id, transaction_id, emoji, user_id, created_at')
      .single()

    if (error) throw error
    if (!data) throw new Error('リアクションの作成に失敗しました')
    return data as Reaction
  },

  async remove(
    householdId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('reactions')
      .delete()
      .eq('household_id', householdId)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (error) throw error
    if (!data) throw new Error('リアクションが見つからないか権限がありません')
  },
}

