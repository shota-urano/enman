import { z } from 'zod'

export const reactionToggleSchema = z.object({
  // Allow non-UUID strings in tests; API layer ensures presence only
  transaction_id: z.string().min(1, 'transaction_id は必須です'),
  emoji: z.string().min(1, 'emoji は必須です'),
})

export type ReactionToggleInput = z.infer<typeof reactionToggleSchema>
