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
  if (!token) throw unauthorized('Missing auth token')

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) throw unauthorized('Invalid session')

  // Optionally receive household scope from header (API レイヤでの二重化用)
  const householdId = req.headers.get('x-household-id') || undefined
  const roleHeader = req.headers.get('x-household-role') as Session['role'] | null

  return {
    userId: data.user.id,
    email: data.user.email ?? undefined,
    householdId,
    role: roleHeader ?? undefined,
    token,
  }
}

export async function assertHouseholdMember(session: Session) {
  if (!session?.userId) throw unauthorized()
  if (!session.householdId) throw forbidden('household scope required')
}
