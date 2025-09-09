import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/subscriptions/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/subscriptionsRepository', () => ({
  subscriptionsRepository: {
    list: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/subscriptionsRepository'
import type { Subscription } from '@/server/repositories/subscriptionsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return { headers: h } as unknown as NextRequest
}

describe('GET /api/subscriptions', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const subscriptionsRepository = vi.mocked(repoModule.subscriptionsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq()
    const res = await route.GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))
    const req = makeReq()
    const res = await route.GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('returns 200 with subscriptions list', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Subscription[] = [
      {
        id: 's-1',
        name: 'Netflix',
        expected_amount: 1200,
        category_id: 'c-1',
        account_id: 'a-1',
        billing_day: 15,
        note: null,
      },
      {
        id: 's-2',
        name: 'Spotify',
        expected_amount: 980,
        category_id: 'c-2',
        account_id: 'a-1',
        billing_day: 20,
        note: 'Family plan',
      },
    ]
    subscriptionsRepository.list.mockResolvedValue(list)

    const req = makeReq({ 'x-household-id': 'h-1' })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(list)
    expect(subscriptionsRepository.list).toHaveBeenCalledWith('h-1')
  })
})

