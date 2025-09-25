import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Notification = {
  id: string
  type: 'subscription_reminder' | 'comment' | 'reaction'
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

export const notificationsRepository = {
  async list(
    householdId: string,
    userId: string,
    opts?: { onlyUnread?: boolean },
  ): Promise<Notification[]> {
    const supabase = createSupabaseAdmin()
    let query = supabase
      .from('notifications')
      .select('id, type, payload, read, created_at')
      .eq('household_id', householdId)
      .eq('user_id', userId)

    if (opts?.onlyUnread) {
      query = query.eq('read', false)
    }

    const { data, error } = await query
      .order('read', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Notification[]
  },
  async markRead(
    householdId: string,
    userId: string,
    id: string,
  ): Promise<Notification> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .select('id, type, payload, read, created_at')
      .single()

    if (error) throw error
    if (!data) throw new Error('通知の既読更新に失敗しました')
    return data as Notification
  },
}

