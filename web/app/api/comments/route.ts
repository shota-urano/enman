import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { commentsRepository } from '@/server/repositories/commentsRepository'
import { commentCreateSchema } from '@/server/schemas/comment'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const url = new URL(req.url)
    const transactionId = url.searchParams.get('transaction_id') || undefined

    if (!transactionId) {
      throw badRequest('transaction_id is required')
    }

    const list = await commentsRepository.listByTransaction(
      session.householdId!,
      transactionId,
    )
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
    const parsed = commentCreateSchema.safeParse(json)
    if (!parsed.success) {
      const message = parsed.error.message
      throw badRequest(message, parsed.error)
    }

    const created = await commentsRepository.create(
      session.householdId!,
      session.userId,
      parsed.data,
    )
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
