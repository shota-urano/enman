import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody } from '@/server/utils/errors'
import { notificationsRepository } from '@/server/repositories/notificationsRepository'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const url = new URL(req.url)
    const readParam = url.searchParams.get('read')
    const onlyUnread = readParam === 'false'

    const list = await notificationsRepository.list(
      session.householdId!,
      session.userId,
      { onlyUnread },
    )
    return NextResponse.json(list, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

