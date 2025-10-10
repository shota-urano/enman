import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { profilesRepository } from '@/server/repositories/profilesRepository'
import { WALKTHROUGH_VERSION } from '@/lib/walkthrough'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const url = new URL(req.url)
    const targetVersion = url.searchParams.get('version') || WALKTHROUGH_VERSION

    const profile = await profilesRepository.ensure(session.userId)
    const seen = profile.latest_walkthrough_version ?? null
    const show = seen !== targetVersion

    return NextResponse.json(
      {
        show,
        target_version: targetVersion,
        seen_version: seen,
      },
      { status: 200 },
    )
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    const json = (await req.json().catch(() => ({}))) as { version?: unknown }
    const version =
      typeof json.version === 'string' && json.version.trim().length > 0
        ? json.version.trim()
        : WALKTHROUGH_VERSION

    if (version.length > 64) {
      throw badRequest('version が長すぎます')
    }

    await profilesRepository.upsert(session.userId, { latest_walkthrough_version: version })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

