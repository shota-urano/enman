import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { subscriptionsRepository } from '@/server/repositories/subscriptionsRepository'
import { subscriptionCreateSchema } from '@/server/schemas/subscription'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const list = await subscriptionsRepository.list(session.householdId!)
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
    const parsed = subscriptionCreateSchema.safeParse(json)
    if (!parsed.success) {
      const message = parsed.error.message
      throw badRequest(message, parsed.error)
    }

    const created = await subscriptionsRepository.create(session.householdId!, parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
