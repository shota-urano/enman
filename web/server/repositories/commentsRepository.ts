import { createSupabaseAdmin } from '@/server/clients/supabase'
import { profilesRepository } from '@/server/repositories/profilesRepository'

export type Comment = {
  id: string
  transaction_id: string
  body: string
  created_by: string
  created_at: string
}

export type CommentWithAuthor = Comment & {
  author: {
    user_id: string
    display_name: string
    avatar_url: string | null
  }
}

export const commentsRepository = {
  async listByTransaction(
    householdId: string,
    transactionId: string,
  ): Promise<CommentWithAuthor[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('comments')
      .select('id, transaction_id, body, created_by, created_at')
      .eq('household_id', householdId)
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    const rows = (data ?? []) as Comment[]
    const profileMap = await profilesRepository.list(rows.map((row) => row.created_by))
    return rows.map((row) => {
      const profile = profileMap[row.created_by]
      return {
        ...row,
        author: {
          user_id: row.created_by,
          display_name: profile?.display_name ?? profilesRepository.DEFAULT_NAME,
          avatar_url: profile?.avatar_url ?? null,
        },
      }
    })
  },
  async create(
    householdId: string,
    userId: string,
    input: import('@/server/schemas/comment').CommentCreateInput,
  ): Promise<CommentWithAuthor> {
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
    if (!data) throw new Error('コメントの作成に失敗しました')
    const profile = await profilesRepository.ensure(userId)
    const base = data as Comment
    return {
      ...base,
      author: {
        user_id: userId,
        display_name: profile.display_name ?? profilesRepository.DEFAULT_NAME,
        avatar_url: profile.avatar_url ?? null,
      },
    }
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
    if (!data) throw new Error('コメントが見つからないか権限がありません')
  },
}
