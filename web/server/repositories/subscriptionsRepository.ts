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
  async create(
    householdId: string,
    input: {
      name: string
      expected_amount: number
      category_id: string
      account_id: string
      billing_day: number
      note?: string | null
    },
  ): Promise<Subscription> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        household_id: householdId,
        name: input.name,
        expected_amount: input.expected_amount,
        category_id: input.category_id,
        account_id: input.account_id,
        billing_day: input.billing_day,
        note: input.note ?? null,
      })
      .select('id, name, expected_amount, category_id, account_id, billing_day, note')
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to create subscription')
    return data as Subscription
  },
  async update(
    householdId: string,
    id: string,
    input: Partial<{
      name: string
      expected_amount: number
      category_id: string
      account_id: string
      billing_day: number
      note: string | null
    }>,
  ): Promise<Subscription> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('subscriptions')
      .update(input)
      .eq('household_id', householdId)
      .eq('id', id)
      .select('id, name, expected_amount, category_id, account_id, billing_day, note')
      .single()

    if (error) throw error
    if (!data) throw new Error('Subscription not found')
    return data as Subscription
  },
}
