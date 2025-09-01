import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { badRequest, normalizeError, toErrorBody } from '@/server/utils/errors'
import { inviteService } from '@/server/services/inviteService'
import { householdsRepository } from '@/server/repositories/householdsRepository'

type Body = { token: string }

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)

    const json = (await req.json().catch(() => ({}))) as Partial<Body>
    if (!json.token || typeof json.token !== 'string') {
      throw badRequest('token is required and must be a string')
    }

    const payload = inviteService.verifyToken(json.token)

    await householdsRepository.join(session.userId, payload.household_id)

    return NextResponse.json({ household_id: payload.household_id }, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

