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

function makeReq(method: string, body?: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  const reqInit: any = { method, headers: h }
  if (body !== undefined) {
    const json = JSON.stringify(body)
    reqInit.json = async () => JSON.parse(json)
  } else {
    reqInit.json = async () => { throw new Error('no body') }
  }
  return reqInit as unknown as NextRequest
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

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq('PATCH')
    const res = await route.PATCH(req, { params: { id: 'a-1' } })
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))
    const req = makeReq('PATCH', { name: 'New Name' })
    const res = await route.PATCH(req, { params: { id: 'a-1' } })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('returns 400 when body invalid', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    // invalid type value
    const req = makeReq('PATCH', { type: 'invalid' })
    const res = await route.PATCH(req, { params: { id: 'a-1' } })
    expect(res.status).toBe(400)
  })

  it('returns 200 with updated account', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const updated: Account = { id: 'a-1', name: 'Wallet', type: 'cash', sort_order: 3 }
    accountsRepository.update.mockResolvedValue(updated)

    const req = makeReq('PATCH', { name: 'Wallet', sort_order: 3 }, { 'x-household-id': 'h-1' })
    const res = await route.PATCH(req, { params: { id: 'a-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(updated)
    expect(accountsRepository.update).toHaveBeenCalledWith('h-1', 'a-1', { name: 'Wallet', sort_order: 3 })
  })
})

