import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { createSupabaseAdmin } from '@/server/clients/supabase'
import { normalizeError, toErrorBody } from '@/server/utils/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const supabase = createSupabaseAdmin()

    const { count, error } = await supabase
      .from('household_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)

    if (error) throw error

    const needs_onboarding = (count ?? 0) === 0
    return NextResponse.json({ needs_onboarding }, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}

