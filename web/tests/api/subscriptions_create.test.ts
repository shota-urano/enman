import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/subscriptions/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/subscriptionsRepository', () => ({
  subscriptionsRepository: {
    create: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/subscriptionsRepository'
import type { Subscription } from '@/server/repositories/subscriptionsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/subscriptions', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const subscriptionsRepository = vi.mocked(repoModule.subscriptionsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when body is invalid', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const req = makeReq({})
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())

    const req = makeReq({
      name: 'Netflix',
      expected_amount: 1200,
      category_id: 'c-1',
      account_id: 'a-1',
      billing_day: 15,
      note: null,
    })
    const res = await route.POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))

    const req = makeReq({
      name: 'Netflix',
      expected_amount: 1200,
      category_id: 'c-1',
      account_id: 'a-1',
      billing_day: 15,
      note: null,
    })
    const res = await route.POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('creates subscription and returns 201', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const sub: Subscription = {
      id: 's-1',
      name: 'Netflix',
      expected_amount: 1200,
      category_id: 'c-1',
      account_id: 'a-1',
      billing_day: 15,
      note: null,
    }
    subscriptionsRepository.create.mockResolvedValue(sub)

    const req = makeReq(
      {
        name: 'Netflix',
        expected_amount: 1200,
        category_id: 'c-1',
        account_id: 'a-1',
        billing_day: 15,
        note: null,
      },
      { 'x-household-id': 'h-1' },
    )
    const res = await route.POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual(sub)
    expect(subscriptionsRepository.create).toHaveBeenCalledWith(
      'h-1',
      {
        name: 'Netflix',
        expected_amount: 1200,
        category_id: 'c-1',
        account_id: 'a-1',
        billing_day: 15,
        note: null,
      },
      'u-1',
    )
  })
})

