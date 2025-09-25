import { z } from 'zod'

export const subscriptionCreateSchema = z.object({
  name: z.string().min(1, 'name は必須です').max(100),
  expected_amount: z.number().finite(),
  category_id: z.string().min(1, 'category_id は必須です'),
  account_id: z.string().min(1, 'account_id は必須です'),
  billing_day: z.number().int().min(1).max(31),
  note: z.string().max(500).nullable().optional(),
  // ユーザーが「確認が必要」かを設定（省略時は DB のデフォルトに委ねる）
  requires_confirmation: z.boolean().optional(),
})

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>

export const subscriptionUpdateSchema = subscriptionCreateSchema.partial()
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>
