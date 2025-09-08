import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/transactions/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/transactionsRepository', () => ({
  transactionsRepository: {
    listByMonth: vi.fn(),
    listByDate: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/transactionsRepository'
import type { Transaction } from '@/server/repositories/transactionsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(url: string, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return { headers: h, url } as unknown as NextRequest
}

describe('GET /api/transactions', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const transactionsRepository = vi.mocked(repoModule.transactionsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq('http://test.local/api/transactions')
    const res = await route.GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))
    const req = makeReq('http://test.local/api/transactions')
    const res = await route.GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('validates month/date presence', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const req = makeReq('http://test.local/api/transactions')
    const res = await route.GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 200 with list by month', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Transaction[] = [
      {
        id: 't-1',
        kind: 'expense',
        occurred_on: '2025-09-01',
        amount: 1200,
        category_id: 'c-1',
        account_id: 'a-1',
        place: 'スーパー',
        memo: '夕飯',
      },
    ]
    transactionsRepository.listByMonth.mockResolvedValue(list)

    const req = makeReq('http://test.local/api/transactions?month=2025-09&kind=expense', {
      'x-household-id': 'h-1',
    })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(list)
    expect(transactionsRepository.listByMonth).toHaveBeenCalledWith('h-1', '2025-09', 'expense')
  })

  it('returns 200 with list by date', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Transaction[] = []
    transactionsRepository.listByDate.mockResolvedValue(list)

    const req = makeReq('http://test.local/api/transactions?date=2025-09-02')
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual([])
    expect(transactionsRepository.listByDate).toHaveBeenCalledWith('h-1', '2025-09-02', undefined)
  })
})

