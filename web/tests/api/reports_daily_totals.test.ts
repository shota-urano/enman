import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

// System under test
import * as route from '@/app/api/reports/daily-totals/route'

// Mocks
vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/reportsRepository', () => ({
  reportsRepository: {
    getDailyTotals: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/reportsRepository'
import type { DailyTotal } from '@/server/repositories/reportsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(url: string, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    url,
  } as unknown as NextRequest
}

describe('GET /api/reports/daily-totals', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const reportsRepository = vi.mocked(repoModule.reportsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())

    const req = makeReq('https://example.com/api/reports/daily-totals?month=2025-09')
    const res = await route.GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))

    const req = makeReq('https://example.com/api/reports/daily-totals?month=2025-09')
    const res = await route.GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('returns 400 when month is missing', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const req = makeReq('https://example.com/api/reports/daily-totals')
    const res = await route.GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when month is invalid', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const req = makeReq('https://example.com/api/reports/daily-totals?month=2025-9')
    const res = await route.GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 200 with daily totals', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const rows: DailyTotal[] = [
      { day: '2025-09-01', income: 1000, expense: 500, diff: 500 },
      { day: '2025-09-02', income: 0, expense: 0, diff: 0 },
    ]
    reportsRepository.getDailyTotals.mockResolvedValue(rows)

    const req = makeReq('https://example.com/api/reports/daily-totals?month=2025-09')
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(rows)
    expect(reportsRepository.getDailyTotals).toHaveBeenCalledWith('h-1', '2025-09', 't')
  })
})

