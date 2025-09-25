import { NextRequest, NextResponse } from 'next/server'
import { assertHouseholdMember, getSession } from '@/server/utils/auth'
import { badRequest, normalizeError, toErrorBody } from '@/server/utils/errors'
import { createSupabaseUser } from '@/server/clients/supabase'

function isDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)

    const { id } = await params
    const url = new URL(req.url)
    const date = url.searchParams.get('date') || ''
    let month: string
    if (date) {
      if (!isDate(date)) throw badRequest('date は YYYY-MM-DD 形式で指定してください')
      month = date.slice(0, 7) + '-01'
    } else {
      const now = new Date()
      const y = now.getUTCFullYear()
      const m = String(now.getUTCMonth() + 1).padStart(2, '0')
      month = `${y}-${m}-01`
    }
    const supabase = createSupabaseUser(session.token)
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount')
      .eq('household_id', session.householdId!)
      .eq('subscription_id', id)
      .eq('occurred_month', month)
      .limit(1)
    if (error) throw error
    const exists = Array.isArray(data) && data.length > 0
    if (!exists) return NextResponse.json({ confirmed: false }, { status: 200 })
    return NextResponse.json({ confirmed: true, tx_id: data[0].id, amount: data[0].amount }, { status: 200 })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
