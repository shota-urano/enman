import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/categories/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/categoriesRepository', () => ({
  categoriesRepository: {
    create: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/categoriesRepository'
import type { Category } from '@/server/repositories/categoriesRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/categories', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const categoriesRepository = vi.mocked(repoModule.categoriesRepository)

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

    const req = makeReq({ name: 'Food', type: 'expense', sort_order: 1 })
    const res = await route.POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))

    const req = makeReq({ name: 'Food', type: 'expense', sort_order: 1 })
    const res = await route.POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('creates category and returns 201', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const cat: Category = { id: 'c-1', name: 'Food', type: 'expense', sort_order: 1 }
    categoriesRepository.create.mockResolvedValue(cat)

    const req = makeReq({ name: 'Food', type: 'expense', sort_order: 1 }, { 'x-household-id': 'h-1' })
    const res = await route.POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual(cat)
    expect(categoriesRepository.create).toHaveBeenCalledWith('h-1', {
      name: 'Food',
      type: 'expense',
      sort_order: 1,
    })
  })
})

