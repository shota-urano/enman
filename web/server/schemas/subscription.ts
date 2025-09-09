import { z } from 'zod'

export const subscriptionCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  expected_amount: z.number().finite(),
  category_id: z.string().min(1, 'category_id is required'),
  account_id: z.string().min(1, 'account_id is required'),
  billing_day: z.number().int().min(1).max(31),
  note: z.string().max(500).nullable().optional(),
})

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>

