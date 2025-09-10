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
  async confirm(
    householdId: string,
    id: string,
    options: { amount?: number; occurred_on?: string; userId: string },
  ): Promise<import('./transactionsRepository').Transaction> {
    const supabase = createSupabaseAdmin()

    // Fetch subscription to derive defaults (amount/occurred_on)
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('id, expected_amount, billing_day')
      .eq('household_id', householdId)
      .eq('id', id)
      .single()

    if (subErr) throw subErr
    if (!sub) throw new Error('Subscription not found')

    type SubRow = { id: string; expected_amount: number; billing_day: number }
    const subRow = sub as unknown as SubRow
    const amount = options.amount ?? subRow.expected_amount

    // Compute occurred_on = current month with billing_day (clamped to last day)
    const occurred_on = options.occurred_on ?? (() => {
      const now = new Date()
      const year = now.getUTCFullYear()
      const month0 = now.getUTCMonth() // 0-based
      const billingDay: number = subRow.billing_day
      // Last day of current month in UTC
      const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
      const day = Math.min(Math.max(billingDay, 1), lastDay)
      const mm = String(month0 + 1).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      return `${year}-${mm}-${dd}`
    })()

    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'confirm_subscription_tx',
      {
        _household: householdId,
        _subscription: id,
        _amount: amount,
        _occurred_on: occurred_on,
        _user: options.userId,
      },
    )
    if (rpcErr) throw rpcErr

    type RpcId = { id: string }
    const createdId: string | undefined = Array.isArray(rpcData)
      ? (rpcData[0] as unknown as RpcId | undefined)?.id
      : (rpcData as unknown as RpcId | null)?.id
    if (!createdId) throw new Error('Failed to confirm subscription')

    // Fetch created transaction to return full object
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select(
        'id, kind, occurred_on, amount, category_id, account_id, place, memo',
      )
      .eq('household_id', householdId)
      .eq('id', createdId)
      .single()
    if (txErr) throw txErr
    if (!tx) throw new Error('Confirmed transaction not found')
    return tx as import('./transactionsRepository').Transaction
  },
  async remove(householdId: string, id: string): Promise<void> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('household_id', householdId)
      .eq('id', id)
      .select('id')
      .single()

    if (error) throw error
    if (!data) throw new Error('Subscription not found')
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
