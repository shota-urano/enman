import { createSupabaseAdmin, createSupabaseUser } from '@/server/clients/supabase'

export type Transaction = {
  id: string
  kind: 'income' | 'expense'
  occurred_on: string
  amount: number
  category_id: string
  account_id: string
  place?: string | null
  place_id?: string | null
  memory_flag: boolean
  memo?: string | null
  created_by: string
}

export type TransactionWithPlace = Transaction & {
  places?: {
    place_id: string
    name: string
    formatted_address: string | null
    lat: number
    lng: number
  } | null
}

export const transactionsRepository = {
  async getById(
    householdId: string,
    id: string,
  ): Promise<TransactionWithPlace> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `id, kind, occurred_on, amount, category_id, account_id, place, place_id, memory_flag, memo, created_by,
         places(place_id, name, formatted_address, lat, lng)`,
      )
      .eq('household_id', householdId)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) throw new Error('取引が見つかりません')
    return data as TransactionWithPlace
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
    const { place_session_token: _token, ...rest } = input
    const { data, error } = await supabase
      .from('transactions')
      .update({ ...rest, ...(userId ? { updated_by: userId } : {}) })
      .eq('household_id', householdId)
      .eq('id', id)
      .select(
        'id, kind, occurred_on, amount, category_id, account_id, place, place_id, memory_flag, memo, created_by',
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
    const { place_session_token: _token, ...rest } = input
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        household_id: householdId,
        kind: rest.kind,
        occurred_on: rest.occurred_on,
        amount: rest.amount,
        category_id: rest.category_id,
        account_id: rest.account_id,
        place: rest.place ?? null,
        place_id: rest.place_id ?? null,
        memory_flag: rest.memory_flag ?? false,
        memo: rest.memo ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select('id, kind, occurred_on, amount, category_id, account_id, place, place_id, memory_flag, memo, created_by')
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
        'id, kind, occurred_on, amount, category_id, account_id, place, place_id, memory_flag, memo, created_by',
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
        'id, kind, occurred_on, amount, category_id, account_id, place, place_id, memory_flag, memo, created_by',
      )
      .eq('household_id', householdId)
      .eq('occurred_on', date)
      .order('created_at', { ascending: true })

    if (kind) query = query.eq('kind', kind)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Transaction[]
  },

  async listMemories(
    householdId: string,
    params: {
      from?: string
      to?: string
      category_id?: string
      bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number }
    },
  ): Promise<TransactionWithPlace[]> {
    const supabase = createSupabaseAdmin()
    let query = supabase
      .from('transactions')
      .select(
        `id, kind, occurred_on, amount, category_id, account_id, place, place_id, memory_flag, memo, created_by,
         places!inner(place_id, name, formatted_address, lat, lng)`,
      )
      .eq('household_id', householdId)
      .eq('memory_flag', true)
      .not('place_id', 'is', null)

    if (params.from) {
      query = query.gte('occurred_on', params.from)
    }
    if (params.to) {
      query = query.lte('occurred_on', params.to)
    }
    if (params.category_id) {
      query = query.eq('category_id', params.category_id)
    }
    if (params.bbox) {
      query = query
        .gte('places.lng', params.bbox.minLng)
        .lte('places.lng', params.bbox.maxLng)
        .gte('places.lat', params.bbox.minLat)
        .lte('places.lat', params.bbox.maxLat)
    }

    query = query.order('occurred_on', { ascending: false }).order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as TransactionWithPlace[]
  },
}
