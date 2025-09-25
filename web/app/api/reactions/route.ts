import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { reactionsRepository } from '@/server/repositories/reactionsRepository'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const url = new URL(req.url)
    const transactionId = url.searchParams.get('transaction_id') || undefined

    if (!transactionId) {
      throw badRequest('transaction_id は必須です')
    }

    const list = await reactionsRepository.listByTransaction(
      session.householdId!,
      transactionId,
    )
    return NextResponse.json(list, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

