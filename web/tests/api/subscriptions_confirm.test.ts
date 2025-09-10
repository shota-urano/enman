import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/subscriptions/[id]/confirm/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/subscriptionsRepository', () => ({
  subscriptionsRepository: {
    confirm: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/subscriptionsRepository'
import type { Transaction } from '@/server/repositories/transactionsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(body?: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => (body ?? {}),
  } as unknown as NextRequest
}

describe('POST /api/subscriptions/:id/confirm', () => {
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
    const res = await route.POST(req, { params: Promise.resolve({ id: 's-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))

    const req = makeReq()
    const res = await route.POST(req, { params: Promise.resolve({ id: 's-1' }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('confirms with specified amount and returns 201 with transaction', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const tx: Transaction = {
      id: 't-1',
      kind: 'expense',
      occurred_on: '2025-09-15',
      amount: 1500,
      category_id: 'c-1',
      account_id: 'a-1',
      place: null,
      memo: 'Netflix',
    }
    subscriptionsRepository.confirm.mockResolvedValue(tx)

    const req = makeReq({ amount: 1500 }, { 'x-household-id': 'h-1' })
    const res = await route.POST(req, { params: Promise.resolve({ id: 's-1' }) })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual(tx)
    expect(subscriptionsRepository.confirm).toHaveBeenCalledWith('h-1', 's-1', { amount: 1500, userId: 'u-1' })
  })
})

