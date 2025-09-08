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
  async update(
    householdId: string,
    id: string,
    input: Partial<{ name: string; type: Account['type']; sort_order: number }>,
  ): Promise<Account> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('accounts')
      .update(input)
      .eq('household_id', householdId)
      .eq('id', id)
      .select('id, name, type, sort_order')
      .single()

    if (error) throw error
    if (!data) throw new Error('Account not found')
    return data as Account
  },
}
