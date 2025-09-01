import { NextRequest, NextResponse } from 'next/server'
import { getSession, assertHouseholdMember } from '@/server/utils/auth'
import { badRequest, normalizeError, toErrorBody } from '@/server/utils/errors'
import { inviteService } from '@/server/services/inviteService'

type Body = { email?: string }

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const json = (await req.json().catch(() => ({}))) as Partial<Body>
    if (json.email !== undefined && typeof json.email !== 'string') {
      throw badRequest('email must be a string if provided')
    }

    const token = inviteService.generateToken(session.householdId!, session.userId, json.email)
    return NextResponse.json({ token }, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

