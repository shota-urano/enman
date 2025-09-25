import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from '@/server/config/env'

export function createSupabaseAdmin(): SupabaseClient {
  if (!serverEnv.SUPABASE_URL) throw new Error('SUPABASE_URL が設定されていません')
  if (!serverEnv.SUPABASE_SERVICE_ROLE) throw new Error('SUPABASE_SERVICE_ROLE が設定されていません')
  return createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>

export function createSupabaseUser(accessToken: string): SupabaseClient {
  const url = serverEnv.SUPABASE_URL
  const anon = serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('SUPABASE_URL が設定されていません')
  if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません')
  return createClient(url, anon, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export type SupabaseUserClient = ReturnType<typeof createSupabaseUser>

