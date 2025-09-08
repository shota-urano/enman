import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { transactionsRepository } from '@/server/repositories/transactionsRepository'

function isMonth(v: string) {
  return /^\d{4}-\d{2}$/.test(v)
}

function isDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const url = new URL(req.url)
    const month = url.searchParams.get('month') || undefined
    const date = url.searchParams.get('date') || undefined
    const kindParam = url.searchParams.get('kind') || undefined
    const kind = kindParam === 'income' || kindParam === 'expense' ? kindParam : undefined

    if (!month && !date) {
      throw badRequest('month or date is required')
    }
    if (month && !isMonth(month)) {
      throw badRequest('month must be YYYY-MM')
    }
    if (date && !isDate(date)) {
      throw badRequest('date must be YYYY-MM-DD')
    }

    let list
    if (date) {
      list = await transactionsRepository.listByDate(session.householdId!, date, kind)
    } else {
      list = await transactionsRepository.listByMonth(session.householdId!, month!, kind)
    }
    return NextResponse.json(list, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

