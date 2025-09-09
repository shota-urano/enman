import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody } from '@/server/utils/errors'
import { commentsRepository } from '@/server/repositories/commentsRepository'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const { id } = await params
    await commentsRepository.remove(session.householdId!, id, session.userId)
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

