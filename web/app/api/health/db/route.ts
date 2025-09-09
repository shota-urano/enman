import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/server/clients/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    // Lightweight head-only select to validate connectivity and permissions
    const { error } = await supabase
      .from('households')
      .select('id', { head: true, count: 'exact' })
      .limit(1)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

