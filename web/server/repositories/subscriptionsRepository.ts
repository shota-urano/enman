import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Subscription = {
  id: string
  name: string
  expected_amount: number
  category_id: string
  account_id: string
  billing_day: number
  note: string | null
}

export const subscriptionsRepository = {
  async list(householdId: string): Promise<Subscription[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, name, expected_amount, category_id, account_id, billing_day, note')
      .eq('household_id', householdId)
      .order('billing_day', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as Subscription[]
  },
}

