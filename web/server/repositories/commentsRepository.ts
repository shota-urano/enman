import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Comment = {
  id: string
  transaction_id: string
  body: string
  created_by: string
  created_at: string
}

export const commentsRepository = {
  async listByTransaction(
    householdId: string,
    transactionId: string,
  ): Promise<Comment[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('comments')
      .select('id, transaction_id, body, created_by, created_at')
      .eq('household_id', householdId)
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as Comment[]
  },
}

