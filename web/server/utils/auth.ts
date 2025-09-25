import type { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/server/clients/supabase'
import { forbidden, unauthorized } from '@/server/utils/errors'

export type Session = {
  userId: string
  email?: string
  householdId?: string
  role?: 'owner' | 'member'
  token: string
}

function extractBearerToken(req: NextRequest): string | undefined {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (auth && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim()
  // Fallback: parse Cookie header (sb-access-token or sb:token)
  const rawCookie = req.headers.get('cookie') || req.headers.get('Cookie')
  if (!rawCookie) return undefined
  const map = Object.fromEntries(
    rawCookie
      .split(';')
      .map((v) => v.trim())
      .map((kv) => {
        const idx = kv.indexOf('=')
        return [kv.slice(0, idx), decodeURIComponent(kv.slice(idx + 1))]
      }),
  ) as Record<string, string>
  return map['sb-access-token'] || map['sb:token']
}

export async function getSession(req: NextRequest): Promise<Session> {
  const token = extractBearerToken(req)
  if (!token) throw unauthorized('認証トークンが見つかりません')

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) throw unauthorized('セッションが無効です')

  // Optionally receive household scope from header (API レイヤでの二重化用)
  let householdId = req.headers.get('x-household-id') || undefined
  let role: Session['role'] | undefined =
    (req.headers.get('x-household-role') as Session['role'] | null) ?? undefined

  // Fallback: ヘッダーに household が無ければ DB のメンバーシップから一意に決定
  if (!householdId) {
    const { data: memberships, error: mErr } = await supabase
      .from('household_members')
      .select('household_id, role, joined_at, created_at')
      .eq('user_id', data.user.id)
      .order('joined_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (!mErr && memberships && memberships.length === 1) {
      householdId = memberships[0].household_id as string
      role = (memberships[0].role as Session['role']) ?? role
    }
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? undefined,
    householdId,
    role,
    token,
  }
}

export async function assertHouseholdMember(session: Session) {
  if (!session?.userId) throw unauthorized()
  if (!session.householdId) throw forbidden('世帯スコープが必要です')
}
