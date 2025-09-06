import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Account = {
  id: string
  name: string
  type: 'cash' | 'bank' | 'card' | 'other'
  sort_order: number
}

export const accountsRepository = {
  async list(householdId: string): Promise<Account[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, type, sort_order')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as Account[]
  },
}

