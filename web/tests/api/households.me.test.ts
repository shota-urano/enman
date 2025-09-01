import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

// System under test
import * as route from '@/app/api/households/me/route'

// Mocks
vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/server/repositories/householdsRepository', () => ({
  householdsRepository: {
    getMyMembership: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/householdsRepository'
import { unauthorized } from '@/server/utils/errors'

// Helpers
function makeReq(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
  } as unknown as NextRequest
}

describe('GET /api/households/me', () => {
  const getSession = vi.mocked(authModule.getSession)
  const householdsRepository = vi.mocked(repoModule.householdsRepository)

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
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 404 when membership is not found', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    householdsRepository.getMyMembership.mockResolvedValue(null as any)

    const req = makeReq()
    const res = await route.GET(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('NOT_FOUND')
  })

  it('returns membership when found', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    householdsRepository.getMyMembership.mockResolvedValue({ household_id: 'h-1', role: 'owner' })

    const req = makeReq()
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ household_id: 'h-1', role: 'owner' })
    expect(householdsRepository.getMyMembership).toHaveBeenCalledWith('u-1')
  })
})

