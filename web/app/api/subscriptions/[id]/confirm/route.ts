import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { subscriptionsRepository } from '@/server/repositories/subscriptionsRepository'

type ConfirmBody = { amount?: number }

function parseConfirmBody(raw: unknown): ConfirmBody {
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>
    if (rec.amount === undefined) return {}
    if (typeof rec.amount !== 'number') throw badRequest('amount must be a number')
    return { amount: rec.amount }
  }
  return {}
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      raw = {}
    }
    const json = parseConfirmBody(raw)

    const { id } = await params
    const tx = await subscriptionsRepository.confirm(
      session.householdId!,
      id,
      { amount: json.amount, userId: session.userId, accessToken: session.token },
    )
    return NextResponse.json(tx, { status: 201 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

