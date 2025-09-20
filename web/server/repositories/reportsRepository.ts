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
    // Ensure strings
    return (data ?? []).map((r: any) => ({ day: r.day, pending_count: r.pending_count })) as PendingConfirm[]
  },
  async getPendingConfirmList(householdId: string, date: string, accessToken?: string): Promise<PendingConfirmDetail[]> {
    const supabase = accessToken ? createSupabaseUser(accessToken) : createSupabaseAdmin()
    const { data, error } = await supabase.rpc('get_pending_subscription_list', {
      _household: householdId,
      _date: date,
    })
    if (error) throw error
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      expected_amount: r.expected_amount,
      billing_day: r.billing_day,
      occurred_on: r.occurred_on,
    })) as PendingConfirmDetail[]
  },
}

