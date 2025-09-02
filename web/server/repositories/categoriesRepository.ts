import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Category = {
  id: string
  name: string
  type: 'income' | 'expense' | 'both'
  sort_order: number
}

export const categoriesRepository = {
  async list(householdId: string): Promise<Category[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type, sort_order')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as Category[]
  },
}

