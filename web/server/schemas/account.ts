import { z } from 'zod'

export const accountCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  type: z.enum(['cash', 'bank', 'card', 'other']),
  sort_order: z.number().int().min(0).default(0),
})

export type AccountCreateInput = z.infer<typeof accountCreateSchema>

export const accountUpdateSchema = accountCreateSchema.partial()
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>

