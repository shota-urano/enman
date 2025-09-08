import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Transaction = {
  id: string
  kind: 'income' | 'expense'
  occurred_on: string
  amount: number
  category_id: string
  account_id: string
  place?: string | null
  memo?: string | null
}

export const transactionsRepository = {
  async remove(
    householdId: string,
    id: string,
  ): Promise<void> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('household_id', householdId)
      .eq('id', id)
      .select('id')
      .single()

    if (error) throw error
    if (!data) throw new Error('Transaction not found')
  },
  async update(
    householdId: string,
    id: string,
    input: import('@/server/schemas/transaction').TxUpdateInput,
  ): Promise<Transaction> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('transactions')
      .update(input as Record<string, unknown>)
      .eq('household_id', householdId)
      .eq('id', id)
      .select(
        'id, kind, occurred_on, amount, category_id, account_id, place, memo',
      )
      .single()

    if (error) throw error
    if (!data) throw new Error('Transaction not found')
    return data as Transaction
  },
  async create(
    householdId: string,
    input: import('@/server/schemas/transaction').TxCreateInput,
  ): Promise<Transaction> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        household_id: householdId,
        kind: input.kind,
        occurred_on: input.occurred_on,
        amount: input.amount,
        category_id: input.category_id,
        account_id: input.account_id,
        place: input.place ?? null,
        memo: input.memo ?? null,
      })
      .select('id, kind, occurred_on, amount, category_id, account_id, place, memo')
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to create transaction')
    return data as Transaction
  },
  async listByMonth(
    householdId: string,
    month: string, // YYYY-MM
    kind?: 'income' | 'expense',
  ): Promise<Transaction[]> {
    const supabase = createSupabaseAdmin()

    // Build date range [firstDay, firstDayNextMonth)
    const firstDay = `${month}-01`
    // Compute next month string safely
    const [y, m] = month.split('-').map((v) => parseInt(v, 10))
    const nextMonthDate = new Date(Date.UTC(y, m, 1)) // month is 0-based in JS Date, so using m (already +1) yields next month first day
    const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`
    const nextFirstDay = `${nextMonth}-01`

    let query = supabase
      .from('transactions')
      .select(
        'id, kind, occurred_on, amount, category_id, account_id, place, memo',
      )
      .eq('household_id', householdId)
      .gte('occurred_on', firstDay)
      .lt('occurred_on', nextFirstDay)
      .order('occurred_on', { ascending: true })
      .order('created_at', { ascending: true })

    if (kind) query = query.eq('kind', kind)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Transaction[]
  },

  async listByDate(
    householdId: string,
    date: string, // YYYY-MM-DD
    kind?: 'income' | 'expense',
  ): Promise<Transaction[]> {
    const supabase = createSupabaseAdmin()

    let query = supabase
      .from('transactions')
      .select(
        'id, kind, occurred_on, amount, category_id, account_id, place, memo',
      )
      .eq('household_id', householdId)
      .eq('occurred_on', date)
      .order('created_at', { ascending: true })

    if (kind) query = query.eq('kind', kind)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Transaction[]
  },
}

