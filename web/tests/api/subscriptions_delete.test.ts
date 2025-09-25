import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/subscriptions/[id]/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/subscriptionsRepository', () => ({
  subscriptionsRepository: {
    remove: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/subscriptionsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
  } as unknown as NextRequest
}

describe('DELETE /api/subscriptions/:id', () => {
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
    const res = await route.DELETE(req, { params: Promise.resolve({ id: 's-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))

    const req = makeReq()
    const res = await route.DELETE(req, { params: Promise.resolve({ id: 's-1' }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('deletes subscription and returns 204', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    subscriptionsRepository.remove.mockResolvedValue(undefined)

    const req = makeReq({ 'x-household-id': 'h-1' })
    const res = await route.DELETE(req, { params: Promise.resolve({ id: 's-1' }) })
    expect(res.status).toBe(204)
    expect(subscriptionsRepository.remove).toHaveBeenCalledWith('h-1', 's-1')
  })
})

