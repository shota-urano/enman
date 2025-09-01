import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/households/invite/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/services/inviteService', () => ({
  inviteService: {
    generateToken: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as inviteModule from '@/server/services/inviteService'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/households/invite', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const inviteService = vi.mocked(inviteModule.inviteService)

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

  it('returns 403 when no household scope', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden())
    const req = makeReq({})
    const res = await route.POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when email has wrong type', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1', role: 'owner' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue(undefined as any)
    const req = makeReq({ email: 123 })
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('generates a token and returns 200', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1', role: 'owner' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue(undefined as any)
    inviteService.generateToken.mockReturnValue('tok-abc')
    const req = makeReq({ email: 'a@example.com' })
    const res = await route.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ token: 'tok-abc' })
    expect(inviteService.generateToken).toHaveBeenCalledWith('h-1', 'u-1', 'a@example.com')
  })
})

