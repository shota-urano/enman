import { createSupabaseAdmin } from '@/server/clients/supabase'
import { serverEnv } from '@/server/config/env'

const BUCKET_ID = 'user-avatars'

export type UserProfile = {
  user_id: string
  display_name: string
  avatar_path: string | null
  avatar_url: string | null
  created_at?: string
  updated_at?: string
}

const DEFAULT_NAME = 'ななし'

function sanitizeName(name: string | null | undefined): string | undefined {
  if (name === undefined) return undefined
  const trimmed = (name ?? '').trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_NAME
}

function normalizeAvatarPath(path: string | null | undefined): string | null {
  if (!path) return null
  return path.replace(/^\/+/, '')
}

function toPublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = serverEnv.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET_ID}/${path}`
}

export const profilesRepository = {
  DEFAULT_NAME,
  BUCKET_ID,

  async get(userId: string): Promise<UserProfile | null> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    const row = data as { user_id: string; display_name: string; avatar: string | null; created_at?: string; updated_at?: string }
    const avatar_path = normalizeAvatarPath(row.avatar)
    return {
      user_id: row.user_id,
      display_name: row.display_name ?? DEFAULT_NAME,
      avatar_path,
      avatar_url: toPublicUrl(avatar_path),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  },

  async ensure(userId: string): Promise<UserProfile> {
    const existing = await this.get(userId)
    if (existing) return existing
    return await this.upsert(userId, { display_name: DEFAULT_NAME, avatar_path: null })
  },

  async upsert(
    userId: string,
    input: { display_name?: string | null; avatar_path?: string | null },
  ): Promise<UserProfile> {
    const payload: Record<string, unknown> = { user_id: userId }
    const name = sanitizeName(input.display_name)
    const avatar = normalizeAvatarPath(input.avatar_path)
    if (name !== undefined) payload.display_name = name
    if (avatar !== undefined) payload.avatar = avatar

    if (Object.keys(payload).length === 1) {
      // Nothing to update besides user_id, return current state to avoid wiping fields.
      const current = await this.ensure(userId)
      return current
    }

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('user_id, display_name, avatar, created_at, updated_at')
      .single()

    if (error) throw error
    if (!data) throw new Error('プロフィール情報の更新に失敗しました')
    const updated = await this.get(userId)
    if (!updated) throw new Error('プロフィール情報の更新に失敗しました')
    return updated
  },

  async list(userIds: string[]): Promise<Record<string, UserProfile>> {
    const unique = Array.from(new Set(userIds.filter(Boolean)))
    if (unique.length === 0) return {}
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar')
      .in('user_id', unique)

    if (error) throw error
    const map: Record<string, UserProfile> = {}
    for (const row of data ?? []) {
      const profileRow = row as { user_id: string; display_name: string; avatar: string | null }
      const avatar_path = normalizeAvatarPath(profileRow.avatar)
      map[profileRow.user_id] = {
        user_id: profileRow.user_id,
        display_name: profileRow.display_name ?? DEFAULT_NAME,
        avatar_path,
        avatar_url: toPublicUrl(avatar_path),
      }
    }
    return map
  },
}
export type { UserProfile as Profile }
