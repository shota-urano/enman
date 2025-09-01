import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/households/join/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/server/services/inviteService', () => ({
  inviteService: {
    verifyToken: vi.fn(),
  },
}))

vi.mock('@/server/repositories/householdsRepository', () => ({
  householdsRepository: {
    join: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as inviteModule from '@/server/services/inviteService'
import type { InvitePayload } from '@/server/services/inviteService'
import * as repoModule from '@/server/repositories/householdsRepository'
import { unauthorized, badRequest } from '@/server/utils/errors'

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/households/join', () => {
  const getSession = vi.mocked(authModule.getSession)
  const inviteService = vi.mocked(inviteModule.inviteService)
  const householdsRepository = vi.mocked(repoModule.householdsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq({})
    const res = await route.POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when token is missing or wrong type', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    const req = makeReq({})
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when token is invalid', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    inviteService.verifyToken.mockImplementation(() => { throw badRequest('invalid') })
    const req = makeReq({ token: 'bad' })
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('joins household and returns 200 with household_id', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    const payload: InvitePayload = {
      household_id: 'h-1',
      inviter: 'u-2',
      iat: Math.floor(Date.now()/1000) - 10,
      exp: Math.floor(Date.now()/1000) + 3600,
    }
    inviteService.verifyToken.mockReturnValue(payload)
    householdsRepository.join.mockResolvedValue(undefined)

    const req = makeReq({ token: 'tok-abc' })
    const res = await route.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ household_id: 'h-1' })
    expect(householdsRepository.join).toHaveBeenCalledWith('u-1', 'h-1')
  })
})

