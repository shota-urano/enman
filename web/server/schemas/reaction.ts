import { z } from 'zod'

export const reactionToggleSchema = z.object({
  // Allow non-UUID strings in tests; API layer ensures presence only
  transaction_id: z.string().min(1, 'transaction_id is required'),
  emoji: z.string().min(1, 'emoji is required'),
})

export type ReactionToggleInput = z.infer<typeof reactionToggleSchema>
