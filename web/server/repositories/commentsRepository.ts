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
  async create(
    householdId: string,
    userId: string,
    input: import('@/server/schemas/comment').CommentCreateInput,
  ): Promise<Comment> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('comments')
      .insert({
        household_id: householdId,
        transaction_id: input.transaction_id,
        body: input.body,
        created_by: userId,
        updated_by: userId,
      })
      .select('id, transaction_id, body, created_by, created_at')
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to create comment')
    return data as Comment
  },
  async remove(
    householdId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('comments')
      .delete()
      .eq('household_id', householdId)
      .eq('id', id)
      .eq('created_by', userId)
      .select('id')
      .single()

    if (error) throw error
    if (!data) throw new Error('Comment not found or not owned by user')
  },
}
