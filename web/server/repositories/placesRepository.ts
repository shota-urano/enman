import { createSupabaseAdmin } from '@/server/clients/supabase'

export type PlaceRecord = {
  place_id: string
  name: string
  formatted_address: string | null
  lat: number
  lng: number
  source: string
  last_verified_at: string
  created_at: string
  updated_at: string
}

type UpsertInput = {
  place_id: string
  name: string
  formatted_address: string | null
  lat: number
  lng: number
  source: string
  last_verified_at: string
}

export const placesRepository = {
  async find(placeId: string): Promise<PlaceRecord | null> {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('places')
      .select('place_id, name, formatted_address, lat, lng, source, last_verified_at, created_at, updated_at')
      .eq('place_id', placeId)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return (data as PlaceRecord | null) ?? null
  },

  async upsert(input: UpsertInput): Promise<PlaceRecord> {
    const supabase = createSupabaseAdmin()
    const now = new Date().toISOString()
    const payload = {
      place_id: input.place_id,
      name: input.name,
      formatted_address: input.formatted_address,
      lat: input.lat,
      lng: input.lng,
      source: input.source,
      last_verified_at: input.last_verified_at,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('places')
      .upsert(payload, { onConflict: 'place_id' })
      .select('place_id, name, formatted_address, lat, lng, source, last_verified_at, created_at, updated_at')
      .single()

    if (error) throw error
    if (!data) throw new Error('places テーブルの更新に失敗しました')
    return data as PlaceRecord
  },

  async touch(placeId: string, timestamp: string): Promise<void> {
    const supabase = createSupabaseAdmin()
    const { error } = await supabase
      .from('places')
      .update({ last_verified_at: timestamp, updated_at: new Date().toISOString() })
      .eq('place_id', placeId)
    if (error) throw error
  },
}

