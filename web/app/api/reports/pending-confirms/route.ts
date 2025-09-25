import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { badRequest, normalizeError, toErrorBody } from '@/server/utils/errors'
import { reportsRepository } from '@/server/repositories/reportsRepository'

function isMonth(v: string) {
  return /^\d{4}-\d{2}$/.test(v)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const url = new URL(req.url)
    const month = url.searchParams.get('month') || undefined
    if (!month) throw badRequest('month は必須です')
    if (!isMonth(month)) throw badRequest('month は YYYY-MM 形式で指定してください')

    const data = await reportsRepository.getPendingConfirmCounts(session.householdId!, month, session.token)
    return NextResponse.json(data, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

