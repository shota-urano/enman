import { NextRequest, NextResponse } from 'next/server'
import { getSession, assertHouseholdMember } from '@/server/utils/auth'
import { transactionsRepository } from '@/server/repositories/transactionsRepository'
import { badRequest, normalizeError, toErrorBody } from '@/server/utils/errors'

function isDate(v: string | null): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function parseBbox(raw: string | null) {
  if (!raw) return null
  const parts = raw.split(',').map((p) => Number(p.trim()))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw badRequest('bbox は lng1,lat1,lng2,lat2 の形式で指定してください')
  }
  const [minLng, minLat, maxLng, maxLat] = parts
  if (minLng > maxLng || minLat > maxLat) {
    throw badRequest('bbox の座標指定が不正です')
  }
  return { minLng, minLat, maxLng, maxLat }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const category = url.searchParams.get('category')
    const bbox = parseBbox(url.searchParams.get('bbox'))

    if (from && !isDate(from)) {
      throw badRequest('from は YYYY-MM-DD 形式で指定してください')
    }
    if (to && !isDate(to)) {
      throw badRequest('to は YYYY-MM-DD 形式で指定してください')
    }

    const list = await transactionsRepository.listMemories(session.householdId!, {
      from: from ?? undefined,
      to: to ?? undefined,
      category_id: category ?? undefined,
      bbox: bbox ?? undefined,
    })

    const shaped = list.map((t) => {
      const place = t.places
      if (!place) {
        return {
          id: t.id,
          date: t.occurred_on,
          amount: t.amount,
          kind: t.kind,
          category_id: t.category_id,
          memo: t.memo ?? null,
          place_id: t.place_id ?? null,
          place_label: t.place ?? null,
          place_name: null,
          formatted_address: null,
          lat: null,
          lng: null,
        }
      }
      return {
        id: t.id,
        date: t.occurred_on,
        amount: t.amount,
        kind: t.kind,
        category_id: t.category_id,
        memo: t.memo ?? null,
        place_id: place.place_id,
        place_label: t.place ?? place.name,
        place_name: place.name,
        formatted_address: place.formatted_address,
        lat: place.lat,
        lng: place.lng,
      }
    })

    return NextResponse.json(shaped, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

