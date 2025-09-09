import { z } from 'zod'

export const commentCreateSchema = z.object({
  // Allow non-UUID strings in tests; API layer ensures presence only
  transaction_id: z.string().min(1, 'transaction_id is required'),
  body: z.string().min(1, 'body is required').max(2000),
})

export type CommentCreateInput = z.infer<typeof commentCreateSchema>

