import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { transactionsRepository } from '@/server/repositories/transactionsRepository'
import { profilesRepository } from '@/server/repositories/profilesRepository'
import { txUpdateSchema } from '@/server/schemas/transaction'
import { ensurePlaceRecord } from '@/server/services/placeResolver'

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

    const body = parsed.data
    const { id } = await params
    const { place_session_token: sessionToken, ...rest } = body

    if (Object.prototype.hasOwnProperty.call(body, 'place_id')) {
      if (body.place_id === null) {
        rest.place_id = null
        rest.place = Object.prototype.hasOwnProperty.call(body, 'place') ? rest.place ?? null : null
        rest.memory_flag = false
      } else if (typeof body.place_id === 'string') {
        const placeRecord = await ensurePlaceRecord(body.place_id, sessionToken)
        rest.place_id = placeRecord.place_id
        if (!Object.prototype.hasOwnProperty.call(body, 'place') || rest.place === undefined || rest.place === '') {
          rest.place = placeRecord.name
        }
        if (Object.prototype.hasOwnProperty.call(body, 'memory_flag')) {
          rest.memory_flag = body.memory_flag === true
        }
      }
    } else if (Object.prototype.hasOwnProperty.call(body, 'memory_flag') && body.memory_flag === true) {
      // memory_flag を単独で true に更新する際は place_id が既に設定済みであることが前提
      // ここでは追加の検証のみ行う
      const current = await transactionsRepository.getById(session.householdId!, id)
      if (!current.place_id) {
        throw badRequest('place_id が設定されていない取引を思い出マップに登録することはできません')
      }
      rest.memory_flag = true
    }

    const updated = await transactionsRepository.update(
      session.householdId!,
      id,
      rest,
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
    const place = tx.places ?? null
    return NextResponse.json(
      {
        id: tx.id,
        kind: tx.kind,
        occurred_on: tx.occurred_on,
        amount: tx.amount,
        category_id: tx.category_id,
        account_id: tx.account_id,
        place: tx.place ?? null,
        place_id: tx.place_id ?? null,
        memory_flag: tx.memory_flag,
        memo: tx.memo ?? null,
        created_by: tx.created_by,
        place_name: place?.name ?? tx.place ?? null,
        place_formatted_address: place?.formatted_address ?? null,
        place_lat: place?.lat ?? null,
        place_lng: place?.lng ?? null,
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
