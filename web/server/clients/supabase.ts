import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from '@/server/config/env'

export function createSupabaseAdmin(): SupabaseClient {
  if (!serverEnv.SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
  if (!serverEnv.SUPABASE_SERVICE_ROLE) throw new Error('Missing SUPABASE_SERVICE_ROLE')
  return createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>

