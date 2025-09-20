import { createHmac } from 'node:crypto'
import { serverEnv } from '@/server/config/env'
import { badRequest } from '@/server/utils/errors'

// Simple signed token: base64url(header).base64url(payload).base64url(signature)
// header: { alg: 'HS256', typ: 'INV' }
// payload: { household_id, inviter, email?, iat, exp }

function base64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  return b
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function sign(data: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(data).digest())
}

export type InvitePayload = {
  household_id: string
  inviter: string
  email?: string
  iat: number
  exp: number
}

export const inviteService = {
  generateToken(
    householdId: string,
    inviterUserId: string,
    email?: string,
    ttlSeconds = 60 * 60 * 24,
  ): string {
    // Prefer explicit secret; fall back to server role key (dev-friendly)
    const secret =
      serverEnv.INVITE_SECRET ||
      serverEnv.SUPABASE_SERVICE_ROLE ||
      serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'dev-invite-secret'

    const header = { alg: 'HS256', typ: 'INV' }
    const now = Math.floor(Date.now() / 1000)
    const payload: InvitePayload = {
      household_id: householdId,
      inviter: inviterUserId,
      email,
      iat: now,
      exp: now + ttlSeconds,
    }
    const h = base64url(JSON.stringify(header))
    const p = base64url(JSON.stringify(payload))
    const s = sign(`${h}.${p}`, secret)
    return `${h}.${p}.${s}`
  },

  verifyToken(token: string): InvitePayload {
    const secret =
      serverEnv.INVITE_SECRET ||
      serverEnv.SUPABASE_SERVICE_ROLE ||
      serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'dev-invite-secret'
    const parts = token.split('.')
    if (parts.length !== 3) throw badRequest('Invalid token format')
    const [h, p, s] = parts
    const expectedSig = sign(`${h}.${p}`, secret)
    if (s !== expectedSig) throw badRequest('Invalid token signature')
    const json = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    let payload: InvitePayload
    try {
      payload = JSON.parse(json)
    } catch {
      throw badRequest('Invalid token payload')
    }
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) throw badRequest('Token expired')
    return payload
  },
}

