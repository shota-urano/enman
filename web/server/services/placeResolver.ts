import { placesRepository, type PlaceRecord } from '@/server/repositories/placesRepository'
import { fetchPlaceDetails } from '@/server/services/googlePlaces'

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30

function isStale(record: PlaceRecord): boolean {
  const ts = Date.parse(record.last_verified_at)
  if (Number.isNaN(ts)) return true
  return Date.now() - ts > THIRTY_DAYS_MS
}

export async function ensurePlaceRecord(placeId: string, sessionToken?: string): Promise<PlaceRecord> {
  const existing = await placesRepository.find(placeId)

  if (existing) {
    if (!isStale(existing) || !sessionToken) {
      return existing
    }
    // Stale and session token provided → refresh
  } else if (!sessionToken) {
    throw new Error('新規の場所を登録する場合は place_session_token が必要です')
  }

  const details = await fetchPlaceDetails(placeId, sessionToken)
  const stored = await placesRepository.upsert({
    place_id: details.place_id,
    name: details.name,
    formatted_address: details.formatted_address,
    lat: details.lat,
    lng: details.lng,
    source: details.source,
    last_verified_at: details.fetched_at,
  })
  return stored
}

