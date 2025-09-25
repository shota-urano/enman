import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/accounts/[id]/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/accountsRepository', () => ({
  accountsRepository: {
    update: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/accountsRepository'
import type { Account } from '@/server/repositories/accountsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('PATCH /api/accounts/:id', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const accountsRepository = vi.mocked(repoModule.accountsRepository)

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

    // invalid type
    const req = makeReq({ type: 'invalid' })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'a-1' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())

    const req = makeReq({ name: 'Wallet' })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'a-1' }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))

    const req = makeReq({ name: 'Wallet' })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'a-1' }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('updates account and returns 200', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const acc: Account = { id: 'a-1', name: 'Wallet', type: 'cash', sort_order: 2 }
    accountsRepository.update.mockResolvedValue(acc)

    const req = makeReq({ name: 'Wallet', sort_order: 2 }, { 'x-household-id': 'h-1' })
    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'a-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(acc)
    expect(accountsRepository.update).toHaveBeenCalledWith('h-1', 'a-1', {
      name: 'Wallet',
      sort_order: 2,
    })
  })
})

