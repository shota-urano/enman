import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, notFound } from '@/server/utils/errors'
import { householdsRepository } from '@/server/repositories/householdsRepository'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const membership = await householdsRepository.getMyMembership(session.userId)
    if (!membership) throw notFound('household membership not found')
    return NextResponse.json(membership, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

