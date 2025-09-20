import { createSupabaseAdmin } from '@/server/clients/supabase'

export type HouseholdMember = {
  user_id: string
  role: 'owner' | 'member'
  approved: boolean
  joined_at: string | null
  created_at: string
}

export const householdsRepository = {
  async listMembers(householdId: string): Promise<HouseholdMember[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('household_members')
      .select('user_id, role, approved, joined_at, created_at')
      .eq('household_id', householdId)
      .order('role', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as HouseholdMember[]
  },
  async setApproved(householdId: string, userId: string, approved: boolean): Promise<HouseholdMember> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('household_members')
      .update({ approved })
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .select('user_id, role, approved, joined_at, created_at')
      .single()
    if (error) throw error
    if (!data) throw new Error('Failed to update approval')
    return data as HouseholdMember
  },
  async isOwner(householdId: string, userId: string): Promise<boolean> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return (data?.role as string) === 'owner'
  },
}

