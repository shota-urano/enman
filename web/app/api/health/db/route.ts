import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/server/clients/supabase'

// Verifies connectivity to the enmann DB on Supabase by issuing a head-only query.
export async function GET() {
  const supabase = createSupabaseAdmin()
  try {
    const { count, error } = await supabase
      .from('households')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          reachable: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, reachable: true, sampleCount: count ?? 0 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        ok: false,
        reachable: false,
        error: message,
      },
      { status: 500 },
    )
  }
}

