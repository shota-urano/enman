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
  async create(
    householdId: string,
    input: { name: string; type: Account['type']; sort_order: number },
  ): Promise<Account> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        household_id: householdId,
        name: input.name,
        type: input.type,
        sort_order: input.sort_order,
      })
      .select('id, name, type, sort_order')
      .single()

    if (error) throw error
    if (!data) throw new Error('アカウントの作成に失敗しました')
    return data as Account
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
      .eq('id', id)
      .eq('household_id', householdId)
      .select('id, name, type, sort_order')
      .single()

    if (error) throw error
    if (!data) throw new Error('アカウントの更新に失敗しました')
    return data as Account
  },
}
