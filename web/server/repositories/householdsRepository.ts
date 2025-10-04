import { createSupabaseAdmin } from '@/server/clients/supabase'
import { profilesRepository } from '@/server/repositories/profilesRepository'

export type HouseholdMember = {
  user_id: string
  role: 'owner' | 'member'
  approved: boolean
  joined_at: string | null
  created_at: string
  profile: {
    display_name: string
    avatar_url: string | null
  }
}

export type Household = {
  id: string
  name: string
  closing_day: number
}

export type HouseholdSettings = {
  closing_day: number
}

export const householdsRepository = {
  async create(ownerUserId: string, name: string): Promise<Household> {
    const supabase = createSupabaseAdmin()
    const { data: hh, error: hErr } = await supabase
      .from('households')
      .insert({ name })
      .select('id, name, closing_day')
      .single()
    if (hErr) throw hErr
    if (!hh) throw new Error('世帯の作成に失敗しました')

    const { error: mErr } = await supabase
      .from('household_members')
      .insert({
        household_id: (hh as Household).id,
        user_id: ownerUserId,
        role: 'owner',
        approved: true,
        joined_at: new Date().toISOString(),
      })
    if (mErr) throw mErr

    await profilesRepository.ensure(ownerUserId)

    return hh as Household
  },

  async join(userId: string, householdId: string): Promise<void> {
    const supabase = createSupabaseAdmin()
    const { data: exists, error: selErr } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .limit(1)
    if (selErr) throw selErr
    if (exists && exists.length > 0) return

    const { error } = await supabase
      .from('household_members')
      .insert({
        household_id: householdId,
        user_id: userId,
        role: 'member',
        approved: false,
        joined_at: null,
      })
    if (error) throw error

    await profilesRepository.ensure(userId)
  },
  async listMembers(householdId: string): Promise<HouseholdMember[]> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('household_members')
      .select('user_id, role, approved, joined_at, created_at')
      .eq('household_id', householdId)
      .order('role', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error

    const rows = (data ?? []) as Array<
      Omit<HouseholdMember, 'profile'>
    >
    const userIds = rows.map((row) => row.user_id)
    const profileMap = await profilesRepository.list(userIds)

    const results: HouseholdMember[] = []
    for (const row of rows) {
      let profile = profileMap[row.user_id]
      if (!profile) {
        profile = await profilesRepository.ensure(row.user_id)
      }
      results.push({
        ...row,
        profile: {
          display_name: profile.display_name ?? profilesRepository.DEFAULT_NAME,
          avatar_url: profile.avatar_url ?? null,
        },
      })
    }

    return results
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
    if (!data) throw new Error('承認状態の更新に失敗しました')
    const profile = await profilesRepository.ensure(userId)
    return {
      ...(data as Omit<HouseholdMember, 'profile'>),
      profile: {
        display_name: profile.display_name ?? profilesRepository.DEFAULT_NAME,
        avatar_url: profile.avatar_url ?? null,
      },
    }
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

  async getSettings(householdId: string): Promise<HouseholdSettings> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('households')
      .select('closing_day')
      .eq('id', householdId)
      .single()
    if (error) throw error
    if (!data) throw new Error('世帯情報が見つかりません')
    return data as HouseholdSettings
  },

  async updateClosingDay(householdId: string, closingDay: number): Promise<HouseholdSettings> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('households')
      .update({ closing_day: closingDay })
      .eq('id', householdId)
      .select('closing_day')
      .single()
    if (error) throw error
    if (!data) throw new Error('締め日の更新に失敗しました')
    return data as HouseholdSettings
  },
}

