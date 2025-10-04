import { createSupabaseAdmin, createSupabaseUser } from '@/server/clients/supabase'

export type Transaction = {
  id: string
  kind: 'income' | 'expense'
  occurred_on: string
  amount: number
  category_id: string
  account_id: string
  place?: string | null
  memo?: string | null
  created_by: string
}

export const transactionsRepository = {
  async getById(
    householdId: string,
    id: string,
  ): Promise<Transaction> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('transactions')
      .select('id, kind, occurred_on, amount, category_id, account_id, place, memo, created_by')
      .eq('household_id', householdId)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) throw new Error('取引が見つかりません')
    return data as Transaction
  },
  async remove(
    householdId: string,
    id: string,
    options?: { accessToken?: string; userId?: string },
  ): Promise<void> {
    const supabase = options?.accessToken ? createSupabaseUser(options.accessToken) : createSupabaseAdmin()
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('household_id', householdId)
      .eq('id', id)
      .select('id')
      .single()

    if (error) throw error
    if (!data) throw new Error('取引が見つかりません')
  },
  async update(
    householdId: string,
    id: string,
    input: import('@/server/schemas/transaction').TxUpdateInput,
    userId?: string,
    options?: { accessToken?: string },
  ): Promise<Transaction> {
    const supabase = options?.accessToken ? createSupabaseUser(options.accessToken) : createSupabaseAdmin()
    const { data, error } = await supabase
      .from('transactions')
      .update({ ...(input as Record<string, unknown>), ...(userId ? { updated_by: userId } : {}) })
      .eq('household_id', householdId)
      .eq('id', id)
      .select(
        'id, kind, occurred_on, amount, category_id, account_id, place, memo, created_by',
      )
      .single()

    if (error) throw error
    if (!data) throw new Error('取引が見つかりません')
    return data as Transaction
  },
  async create(
    householdId: string,
    userId: string,
    input: import('@/server/schemas/transaction').TxCreateInput,
    options?: { accessToken?: string },
  ): Promise<Transaction> {
    const supabase = options?.accessToken ? createSupabaseUser(options.accessToken) : createSupabaseAdmin()
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
        created_by: userId,
        updated_by: userId,
      })
      .select('id, kind, occurred_on, amount, category_id, account_id, place, memo, created_by')
      .single()

    if (error) throw error
    if (!data) throw new Error('取引の作成に失敗しました')
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
        'id, kind, occurred_on, amount, category_id, account_id, place, memo, created_by',
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
        'id, kind, occurred_on, amount, category_id, account_id, place, memo, created_by',
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

