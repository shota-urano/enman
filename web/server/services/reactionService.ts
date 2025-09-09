import type { Session } from '@/server/utils/auth'
import { reactionsRepository } from '@/server/repositories/reactionsRepository'
import { conflict } from '@/server/utils/errors'

export const reactionService = {
  async toggle(
    input: import('@/server/schemas/reaction').ReactionToggleInput,
    session: Session,
  ) {
    const householdId = session.householdId!
    const userId = session.userId

    const existing = await reactionsRepository.findByUserAndTransaction(
      householdId,
      input.transaction_id,
      userId,
    )

    // If exists and same emoji -> remove (toggle off)
    if (existing && existing.emoji === input.emoji) {
      await reactionsRepository.remove(householdId, existing.id, userId)
      return null
    }

    // If exists with different emoji -> remove then insert with new emoji
    if (existing && existing.emoji !== input.emoji) {
      await reactionsRepository.remove(householdId, existing.id, userId)
    }

    try {
      const created = await reactionsRepository.create(householdId, userId, input)
      return created
    } catch (e: unknown) {
      // Surface unique constraint as 409 CONFLICT (for race conditions)
      type PgError = { code?: string; message?: string; details?: { code?: string } }
      const err = e as PgError
      const code = err?.code || err?.details?.code
      const message = err?.message || 'Unique constraint violated'
      if (code === '23505' || /duplicate key/i.test(message)) {
        throw conflict('Reaction already exists', e)
      }
      throw e
    }
  },
}

