import { serverEnv } from '@/server/config/env'

export type GooglePlaceDetails = {
  place_id: string
  name: string
  formatted_address: string | null
  lat: number
  lng: number
  source: string
  fetched_at: string
}

function extractPlaceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  if (typeof obj.id === 'string' && obj.id.trim().length > 0) {
    return obj.id.trim()
  }
  if (typeof obj.name === 'string') {
    const parts = obj.name.split('/')
    const candidate = parts[parts.length - 1]
    if (candidate) return candidate
  }
  return null
}

function extractDisplayName(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  if (typeof obj.text === 'string' && obj.text.trim().length > 0) {
    return obj.text.trim()
  }
  if (typeof obj.localizedText === 'string' && obj.localizedText.trim().length > 0) {
    return obj.localizedText.trim()
  }
  if (typeof obj.name === 'string' && obj.name.trim().length > 0) {
    return obj.name.trim()
  }
  return null
}

export async function fetchPlaceDetails(placeId: string, sessionToken?: string): Promise<GooglePlaceDetails> {
  const apiKey = serverEnv.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY が設定されていません')
  }
  const endpoint = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`)
  endpoint.searchParams.set('fields', 'id,displayName,formattedAddress,location')

  const headers: Record<string, string> = {
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
  }
  if (sessionToken && sessionToken.trim()) {
    headers['X-Goog-Session-Token'] = sessionToken.trim()
  }

  const res = await fetch(endpoint, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const message = `Places API 呼び出しに失敗しました (status: ${res.status})`
    throw new Error(body ? `${message}: ${body}` : message)
  }

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!json) {
    throw new Error('Places API レスポンスが不正です')
  }

  const resolvedId = extractPlaceId(json)
  if (!resolvedId) {
    throw new Error('Places API レスポンスから place_id を取得できませんでした')
  }

  const displayName = extractDisplayName(json.displayName ?? null)
  if (!displayName) {
    throw new Error('Places API レスポンスから名称を取得できませんでした')
  }

  const formattedAddress =
    typeof json.formattedAddress === 'string' && json.formattedAddress.trim().length > 0
      ? json.formattedAddress.trim()
      : null

  const location = json.location
  if (!location || typeof location !== 'object') {
    throw new Error('Places API レスポンスから座標を取得できませんでした')
  }
  const latitude = Number((location as Record<string, unknown>).latitude)
  const longitude = Number((location as Record<string, unknown>).longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Places API レスポンスの座標が不正です')
  }

  const now = new Date().toISOString()
  return {
    place_id: resolvedId,
    name: displayName,
    formatted_address: formattedAddress,
    lat: latitude,
    lng: longitude,
    source: 'google_places_new',
    fetched_at: now,
  }
}

