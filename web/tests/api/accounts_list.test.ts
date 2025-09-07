import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/accounts/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/accountsRepository', () => ({
  accountsRepository: {
    list: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/accountsRepository'
import type { Account } from '@/server/repositories/accountsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return { headers: h } as unknown as NextRequest
}

describe('GET /api/accounts', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const accountsRepository = vi.mocked(repoModule.accountsRepository)

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

  it('returns 200 with accounts list', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Account[] = [
      { id: 'a-1', name: 'Cash', type: 'cash', sort_order: 1 },
      { id: 'a-2', name: 'Main Bank', type: 'bank', sort_order: 2 },
    ]
    accountsRepository.list.mockResolvedValue(list)

    const req = makeReq({ 'x-household-id': 'h-1' })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(list)
    expect(accountsRepository.list).toHaveBeenCalledWith('h-1')
  })
})

