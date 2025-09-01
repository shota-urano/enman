import { createSupabaseAdmin } from '@/server/clients/supabase'

export type Household = {
  id: string
  name: string
}

export const householdsRepository = {
  async create(userId: string, name: string): Promise<Household> {
    const supabase = createSupabaseAdmin()

    // Insert household
    const { data: hh, error: err1 } = await supabase
      .from('households')
      .insert({ name, created_by: userId })
      .select('id, name')
      .single()

    if (err1) throw err1
    if (!hh) throw new Error('Failed to create household')

    // Link creator as owner member
    const { error: err2 } = await supabase
      .from('household_members')
      .insert({
        household_id: hh.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      })

    if (err2) throw err2

    return { id: hh.id, name: hh.name }
  },
}

