import { createSupabaseAdmin, createSupabaseUser } from '@/server/clients/supabase'

export type DailyTotal = {
  day: string
  income: number
  expense: number
  diff: number
}

export type PendingConfirm = {
  day: string
  pending_count: number
}

export type PendingConfirmDetail = {
  id: string
  name: string
  expected_amount: number
  billing_day: number
  occurred_on: string
}

export const reportsRepository = {
  async getDailyTotals(householdId: string, month: string, accessToken?: string): Promise<DailyTotal[]> {
    // Prefer user-scoped client to satisfy RPCs that rely on auth.uid()
    const supabase = accessToken ? createSupabaseUser(accessToken) : createSupabaseAdmin()
    // The RPC expects a date; when given YYYY-MM, convert to the first day of that month
    const monthStart = /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : month
    const { data, error } = await supabase.rpc('get_daily_totals', {
      _household: householdId,
      _month: monthStart,
    })
    if (error) throw error
    return (data ?? []) as DailyTotal[]
  },
  async getPendingConfirmCounts(householdId: string, month: string, accessToken?: string): Promise<PendingConfirm[]> {
    const supabase = accessToken ? createSupabaseUser(accessToken) : createSupabaseAdmin()
    const monthKey = /^\d{4}-\d{2}$/.test(month) ? month : month.slice(0, 7)
    const { data, error } = await supabase.rpc('get_pending_subscription_confirms', {
      _household: householdId,
      _month: monthKey,
    })
    if (error) throw error
    // Normalize unknown rows -> PendingConfirm
    return (data ?? []).map((row: unknown) => {
      const r = (row ?? {}) as Record<string, unknown>
      const day = typeof r.day === 'string' ? r.day : String(r.day ?? '')
      const pending_count = typeof r.pending_count === 'number' ? r.pending_count : Number(r.pending_count ?? 0)
      return { day, pending_count }
    }) as PendingConfirm[]
  },
  async getPendingConfirmList(householdId: string, date: string, accessToken?: string): Promise<PendingConfirmDetail[]> {
    const supabase = accessToken ? createSupabaseUser(accessToken) : createSupabaseAdmin()
    const { data, error } = await supabase.rpc('get_pending_subscription_list', {
      _household: householdId,
      _date: date,
    })
    if (error) throw error
    return (data ?? []).map((row: unknown) => {
      const r = (row ?? {}) as Record<string, unknown>
      const id = String(r.id ?? '')
      const name = String(r.name ?? '')
      const expected_amount = typeof r.expected_amount === 'number' ? r.expected_amount : Number(r.expected_amount ?? 0)
      const billing_day = typeof r.billing_day === 'number' ? r.billing_day : Number(r.billing_day ?? 0)
      const occurred_on = String(r.occurred_on ?? '')
      return { id, name, expected_amount, billing_day, occurred_on }
    }) as PendingConfirmDetail[]
  },
}

