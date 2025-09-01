import { z } from 'zod'

export const householdCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
})

export type HouseholdCreateInput = z.infer<typeof householdCreateSchema>

