import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { subscriptionsRepository } from '@/server/repositories/subscriptionsRepository'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const json = await req.json().catch(() => ({} as any))
    if (json && 'amount' in json && typeof json.amount !== 'number') {
      throw badRequest('amount must be a number')
    }

    const { id } = await params
    const tx = await subscriptionsRepository.confirm(
      session.householdId!,
      id,
      { amount: json.amount, userId: session.userId },
    )
    return NextResponse.json(tx, { status: 201 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

