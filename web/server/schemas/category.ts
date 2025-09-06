import { z } from 'zod'

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  type: z.enum(['income', 'expense', 'both']),
  sort_order: z.number().int().min(0).default(0),
})

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>

export const categoryUpdateSchema = categoryCreateSchema.partial()
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
