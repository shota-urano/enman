import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { badRequest, normalizeError, toErrorBody } from '@/server/utils/errors'
import { reportsRepository } from '@/server/repositories/reportsRepository'

function isDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const url = new URL(req.url)
    const date = url.searchParams.get('date') || undefined
    if (!date) throw badRequest('date は必須です')
    if (!isDate(date)) throw badRequest('date は YYYY-MM-DD 形式で指定してください')

    const list = await reportsRepository.getPendingConfirmList(session.householdId!, date, session.token)
    return NextResponse.json(list, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

