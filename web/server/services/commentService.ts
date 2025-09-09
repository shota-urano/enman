import { commentsRepository } from '@/server/repositories/commentsRepository'
import type { Session } from '@/server/utils/auth'
import { notificationService } from '@/server/services/notificationService'

export const commentService = {
  async create(
    input: import('@/server/schemas/comment').CommentCreateInput,
    session: Session,
  ) {
    const created = await commentsRepository.create(
      session.householdId!,
      session.userId,
      input,
    )

    // Fire notifications to other household members (best-effort)
    try {
      await notificationService.notifyCommentCreated({
        householdId: session.householdId!,
        actorUserId: session.userId,
        transactionId: created.transaction_id,
        commentId: created.id,
      })
    } catch {
      // Intentionally swallow notification errors to not fail main flow
    }

    return created
  },
}

