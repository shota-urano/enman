import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

// System under test
import * as route from '@/app/api/households/route'

// Mocks
vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/server/repositories/householdsRepository', () => ({
  householdsRepository: {
    create: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/householdsRepository'
import type { Household } from '@/server/repositories/householdsRepository'
import { unauthorized } from '@/server/utils/errors'

// Helpers
function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/households', () => {
  const getSession = vi.mocked(authModule.getSession)
  const householdsRepository = vi.mocked(repoModule.householdsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when body is invalid', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)

    const req = makeReq({})
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())

    const req = makeReq({ name: 'My Household' })
    const res = await route.POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('creates household and returns 201', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)

    const hh: Household = { id: 'h-1', name: 'Home', closing_day: 31 }
    householdsRepository.create.mockResolvedValue(hh)

    const req = makeReq({ name: 'Home' })
    const res = await route.POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual({ id: 'h-1', name: 'Home', closing_day: 31 })
    expect(householdsRepository.create).toHaveBeenCalledWith('u-1', 'Home')
  })
})
