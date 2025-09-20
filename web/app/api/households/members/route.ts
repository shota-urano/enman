import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, forbidden } from '@/server/utils/errors'
import { householdsRepository } from '@/server/repositories/householdsRepository'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const list = await householdsRepository.listMembers(session.householdId!)
    return NextResponse.json(list, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

