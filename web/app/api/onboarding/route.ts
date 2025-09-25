import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { badRequest, normalizeError, toErrorBody } from '@/server/utils/errors'
import { createSupabaseAdmin } from '@/server/clients/supabase'
import { inviteService } from '@/server/services/inviteService'
import { householdsRepository } from '@/server/repositories/householdsRepository'

type Body = {
  invite_token?: string
  household_name?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    const json = (await req.json().catch(() => ({}))) as Partial<Body>

    const hasInvite = typeof json.invite_token === 'string' && json.invite_token.trim() !== ''
    const hasName = typeof json.household_name === 'string' && json.household_name.trim() !== ''
    if ((hasInvite && hasName) || (!hasInvite && !hasName)) {
      throw badRequest('invite_token と household_name のいずれか一方のみを指定してください')
    }

    const supabase = createSupabaseAdmin()

    // If already has at least one membership, no-op (idempotent)
    const { data: memberships, error: mErr } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', session.userId)
      .limit(1)
    if (mErr) throw mErr
    if (memberships && memberships.length > 0) {
      return NextResponse.json({ action: 'noop', household_id: memberships[0].household_id }, { status: 200 })
    }

    if (hasInvite) {
      const payload = inviteService.verifyToken(json.invite_token!)
      await householdsRepository.join(session.userId, payload.household_id)
      return NextResponse.json({ action: 'joined', household_id: payload.household_id }, { status: 200 })
    }

    // hasName
    const hh = await householdsRepository.create(session.userId, json.household_name!.trim())
    return NextResponse.json({ action: 'created', household_id: hh.id }, { status: 201 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

