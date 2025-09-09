import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { subscriptionsRepository } from '@/server/repositories/subscriptionsRepository'
import { subscriptionUpdateSchema } from '@/server/schemas/subscription'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const json = await req.json().catch(() => ({}))
    const parsed = subscriptionUpdateSchema.safeParse(json)
    if (!parsed.success) {
      const message = parsed.error.message
      throw badRequest(message, parsed.error)
    }

    const { id } = await params
    const updated = await subscriptionsRepository.update(
      session.householdId!,
      id,
      parsed.data,
    )
    return NextResponse.json(updated, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const { id } = await params
    await subscriptionsRepository.remove(session.householdId!, id)
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
