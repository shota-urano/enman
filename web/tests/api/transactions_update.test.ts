import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/transactions/[id]/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/transactionsRepository', () => ({
  transactionsRepository: {
    update: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/transactionsRepository'
import type { Transaction } from '@/server/repositories/transactionsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('PATCH /api/transactions/:id', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const transactionsRepository = vi.mocked(repoModule.transactionsRepository)

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

    // invalid kind
    const req = makeReq({ kind: 'invalid' })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 't-1' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())

    const req = makeReq({ amount: 3000 })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 't-1' }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))

    const req = makeReq({ amount: 3000 })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 't-1' }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('updates transaction and returns 200', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const tx: Transaction = {
      id: 't-1',
      kind: 'expense',
      occurred_on: '2025-09-01',
      amount: 3000,
      category_id: 'c-1',
      account_id: 'a-1',
      place: 'Store',
      memo: 'updated memo',
    }
    transactionsRepository.update.mockResolvedValue(tx)

    const req = makeReq({ amount: 3000, memo: 'updated memo' }, { 'x-household-id': 'h-1' })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 't-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(tx)
    expect(transactionsRepository.update).toHaveBeenCalledWith('h-1', 't-1', {
      amount: 3000,
      memo: 'updated memo',
    }, 'u-1', { accessToken: 't' })
  })
})
