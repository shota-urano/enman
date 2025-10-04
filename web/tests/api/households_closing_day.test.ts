import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/households/closing-day/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/householdsRepository', () => ({
  householdsRepository: {
    getSettings: vi.fn(),
    updateClosingDay: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/householdsRepository'
import { unauthorized } from '@/server/utils/errors'

function makeReq(body: unknown = undefined): NextRequest {
  return {
    headers: new Headers(),
    json: async () => body,
  } as unknown as NextRequest
}

describe('GET /api/households/closing-day', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const householdsRepository = vi.mocked(repoModule.householdsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns closing day for authorized household member', async () => {
    const session: Session = { userId: 'u-1', householdId: 'h-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    householdsRepository.getSettings.mockResolvedValue({ closing_day: 25 })

    const res = await route.GET(makeReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ closing_day: 25 })
    expect(getSession).toHaveBeenCalled()
    expect(assertHouseholdMember).toHaveBeenCalledWith(session)
    expect(householdsRepository.getSettings).toHaveBeenCalledWith('h-1')
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())

    const res = await route.GET(makeReq())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })
})

describe('PATCH /api/households/closing-day', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const householdsRepository = vi.mocked(repoModule.householdsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('validates request body', async () => {
    const session: Session = { userId: 'u-1', householdId: 'h-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const res = await route.PATCH(makeReq({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(householdsRepository.updateClosingDay).not.toHaveBeenCalled()
  })

  it('updates closing day', async () => {
    const session: Session = { userId: 'u-1', householdId: 'h-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    householdsRepository.updateClosingDay.mockResolvedValue({ closing_day: 20 })

    const res = await route.PATCH(makeReq({ closing_day: 20 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ closing_day: 20 })
    expect(householdsRepository.updateClosingDay).toHaveBeenCalledWith('h-1', 20)
  })
})
