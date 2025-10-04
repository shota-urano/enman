import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { householdsRepository } from '@/server/repositories/householdsRepository'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { z } from 'zod'

const updateClosingDaySchema = z.object({
  closing_day: z
    .number({ invalid_type_error: 'closing_day は数値で指定してください' })
    .int('closing_day は整数で指定してください')
    .min(1, 'closing_day は 1 以上 31 以下で指定してください')
    .max(31, 'closing_day は 1 以上 31 以下で指定してください'),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const settings = await householdsRepository.getSettings(session.householdId!)
    return NextResponse.json(settings)
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const json = await req.json().catch(() => ({}))
    const parsed = updateClosingDaySchema.safeParse(json)
    if (!parsed.success) {
      throw badRequest(parsed.error.message, parsed.error)
    }

    const settings = await householdsRepository.updateClosingDay(
      session.householdId!,
      parsed.data.closing_day,
    )
    return NextResponse.json(settings)
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
