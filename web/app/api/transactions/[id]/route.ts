import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { transactionsRepository } from '@/server/repositories/transactionsRepository'
import { profilesRepository } from '@/server/repositories/profilesRepository'
import { txUpdateSchema } from '@/server/schemas/transaction'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const json = await req.json().catch(() => ({}))
    const parsed = txUpdateSchema.safeParse(json)
    if (!parsed.success) {
      const message = parsed.error.message
      throw badRequest(message, parsed.error)
    }

    const { id } = await params
    const updated = await transactionsRepository.update(
      session.householdId!,
      id,
      parsed.data,
      session.userId,
      { accessToken: session.token },
    )
    return NextResponse.json(updated, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const { id } = await params
    const tx = await transactionsRepository.getById(session.householdId!, id)
    const profile = await profilesRepository.ensure(tx.created_by)
    return NextResponse.json(
      {
        ...tx,
        creator: {
          user_id: profile.user_id,
          display_name: profile.display_name ?? profilesRepository.DEFAULT_NAME,
          avatar_url: profile.avatar_url ?? null,
        },
      },
      { status: 200 },
    )
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
    await transactionsRepository.remove(session.householdId!, id, { accessToken: session.token })
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
