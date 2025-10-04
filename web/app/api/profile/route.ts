import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { profilesRepository } from '@/server/repositories/profilesRepository'
import { profileUpdateSchema } from '@/server/schemas/profile'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const profile = await profilesRepository.ensure(session.userId)
    return NextResponse.json(profile, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req)
    const json = await req.json().catch(() => ({}))
    const parsed = profileUpdateSchema.safeParse(json)
    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message ?? 'プロフィール情報の形式が正しくありません'
      throw badRequest(message, parsed.error)
    }
    const updated = await profilesRepository.upsert(session.userId, parsed.data)
    return NextResponse.json(updated, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
