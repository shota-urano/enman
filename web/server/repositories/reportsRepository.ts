import { createSupabaseAdmin } from '@/server/clients/supabase'

export type DailyTotal = {
  day: string
  income: number
  expense: number
  diff: number
}

export const reportsRepository = {
  async getDailyTotals(householdId: string, month: string): Promise<DailyTotal[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase.rpc('get_daily_totals', {
      _household: householdId,
      _month: month,
    })
    if (error) throw error
    return (data ?? []) as DailyTotal[]
  },
}

