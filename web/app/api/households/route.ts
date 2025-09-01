import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { householdCreateSchema } from '@/server/schemas/household'
import { householdsRepository } from '@/server/repositories/householdsRepository'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)

    const json = await req.json().catch(() => ({}))
    const parsed = householdCreateSchema.safeParse(json)
    if (!parsed.success) {
      const message = parsed.error.message
      throw badRequest(message, parsed.error)
    }

    const result = await householdsRepository.create(session.userId, parsed.data.name)
    return NextResponse.json(result, { status: 201 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
