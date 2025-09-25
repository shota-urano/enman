import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest, forbidden } from '@/server/utils/errors'
import { householdsRepository } from '@/server/repositories/householdsRepository'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const { userId } = await params
    const json = await req.json().catch(() => ({})) as { approved?: boolean }
    if (typeof json.approved !== 'boolean') {
      throw badRequest('approved は真偽値で指定してください')
    }

    // Only owner can approve/unapprove
    const isOwner = await householdsRepository.isOwner(session.householdId!, session.userId)
    if (!isOwner) throw forbidden('オーナーのみ操作可能です')

    const updated = await householdsRepository.setApproved(session.householdId!, userId, json.approved)
    return NextResponse.json(updated, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

