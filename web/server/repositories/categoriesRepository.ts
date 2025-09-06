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
  async create(
    householdId: string,
    input: { name: string; type: Category['type']; sort_order: number },
  ): Promise<Category> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('categories')
      .insert({
        household_id: householdId,
        name: input.name,
        type: input.type,
        sort_order: input.sort_order,
      })
      .select('id, name, type, sort_order')
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to create category')
    return data as Category
  },
}
