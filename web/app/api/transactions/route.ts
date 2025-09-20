import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { transactionsRepository } from '@/server/repositories/transactionsRepository'
import { categoriesRepository } from '@/server/repositories/categoriesRepository'
import { accountsRepository } from '@/server/repositories/accountsRepository'
import { txCreateSchema } from '@/server/schemas/transaction'

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

    // When date is specified, return UI-optimized shape for the detail modal.
    if (date) {
      const list = await transactionsRepository.listByDate(session.householdId!, date, kind)
      if (list.length === 0) return NextResponse.json([], { status: 200 })
      // Load categories and accounts to resolve names
      const [cats, accts] = await Promise.all([
        categoriesRepository.list(session.householdId!),
        accountsRepository.list(session.householdId!),
      ])
      const catMap = new Map(cats.map((c) => [c.id, c.name]))
      const accMap = new Map(accts.map((a) => [a.id, a.name]))

      const shaped = list.map((t) => ({
        id: t.id,
        date: t.occurred_on,
        amount: t.amount,
        type: t.kind,
        category_name: catMap.get(t.category_id),
        memo: t.memo ?? undefined,
        place: t.place ?? undefined,
        account_name: accMap.get(t.account_id),
      }))
      return NextResponse.json(shaped, { status: 200 })
    }

    // Month-based listing keeps the original repository shape (backward compatible)
    const list = await transactionsRepository.listByMonth(session.householdId!, month!, kind)
    return NextResponse.json(list, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const json = await req.json().catch(() => ({}))
    const parsed = txCreateSchema.safeParse(json)
    if (!parsed.success) {
      const message = parsed.error.message
      throw badRequest(message, parsed.error)
    }

    const created = await transactionsRepository.create(
      session.householdId!,
      session.userId,
      parsed.data,
      { accessToken: session.token },
    )
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
