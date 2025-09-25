import { createClient } from '@supabase/supabase-js'

// Safe to import in client components; uses public anon key only
export const createSupabaseBrowser = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL または NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません')
  }
  return createClient(url, anon)
}

