import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/categories/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/categoriesRepository', () => ({
  categoriesRepository: {
    list: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/categoriesRepository'
import type { Category } from '@/server/repositories/categoriesRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return { headers: h } as unknown as NextRequest
}

describe('GET /api/categories', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const categoriesRepository = vi.mocked(repoModule.categoriesRepository)

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

  it('returns 200 with categories list', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Category[] = [
      { id: 'c-1', name: 'Food', type: 'expense', sort_order: 1 },
      { id: 'c-2', name: 'Salary', type: 'income', sort_order: 2 },
    ]
    categoriesRepository.list.mockResolvedValue(list)

    const req = makeReq({ 'x-household-id': 'h-1' })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(list)
    expect(categoriesRepository.list).toHaveBeenCalledWith('h-1')
  })
})

