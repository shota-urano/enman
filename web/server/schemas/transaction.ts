import { z } from 'zod'

export const txCreateSchema = z.object({
  kind: z.enum(['income', 'expense']),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().min(0),
  category_id: z.string().uuid(),
  account_id: z.string().uuid(),
  place: z.string().optional(),
  memo: z.string().optional(),
})

export const txUpdateSchema = txCreateSchema.partial()

export type TxCreateInput = z.infer<typeof txCreateSchema>
export type TxUpdateInput = z.infer<typeof txUpdateSchema>

