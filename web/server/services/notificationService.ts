import { createSupabaseAdmin } from '@/server/clients/supabase'

type NotificationType = 'subscription_reminder' | 'comment' | 'reaction'

export type NotificationPayload = Record<string, unknown>

async function listHouseholdMemberIds(householdId: string): Promise<string[]> {
  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)

  if (error) throw error
  return (data ?? []).map((r) => r.user_id as string)
}

async function insertNotifications(
  householdId: string,
  userIds: string[],
  type: NotificationType,
  payload: NotificationPayload,
) {
  if (userIds.length === 0) return
  const supabase = createSupabaseAdmin()
  const rows = userIds.map((uid) => ({
    household_id: householdId,
    user_id: uid,
    type,
    payload,
  }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) throw error
}

export const notificationService = {
  async notifyCommentCreated(params: {
    householdId: string
    actorUserId: string
    transactionId: string
    commentId: string
  }) {
    const members = await listHouseholdMemberIds(params.householdId)
    const recipients = members.filter((id) => id !== params.actorUserId)
    await insertNotifications(
      params.householdId,
      recipients,
      'comment',
      {
        transaction_id: params.transactionId,
        comment_id: params.commentId,
      },
    )
  },
}

