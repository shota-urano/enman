import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/reactions/toggle/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/services/reactionService', () => ({
  reactionService: {
    toggle: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as serviceModule from '@/server/services/reactionService'
import { unauthorized, forbidden, conflict } from '@/server/utils/errors'

function makeReq(body?: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  const req = {
    headers: h,
    url: 'http://test.local/api/reactions/toggle',
    json: async () => body,
  } as Partial<NextRequest> & { json: () => Promise<unknown> }
  return req as unknown as NextRequest
}

describe('POST /api/reactions/toggle', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const reactionService = vi.mocked(serviceModule.reactionService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq({ transaction_id: 'tx-1', emoji: '👍' })
    const res = await route.POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))
    const req = makeReq({ transaction_id: 'tx-1', emoji: '👍' })
    const res = await route.POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('validates input shape', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const req = makeReq({})
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('toggles on and returns 200 with Reaction', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const reaction = {
      id: 're-1',
      transaction_id: 'tx-1',
      emoji: '👍',
      user_id: 'u-1',
      created_at: '2025-09-02T12:00:00Z',
    }
    reactionService.toggle.mockResolvedValue(reaction as any)

    const req = makeReq({ transaction_id: 'tx-1', emoji: '👍' }, { 'x-household-id': 'h-1' })
    const res = await route.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(reaction)
    expect(reactionService.toggle).toHaveBeenCalledWith(
      { transaction_id: 'tx-1', emoji: '👍' },
      { userId: 'u-1', token: 't', householdId: 'h-1' },
    )
  })

  it('toggles off and returns 200 with null', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    reactionService.toggle.mockResolvedValue(null as any)

    const req = makeReq({ transaction_id: 'tx-1', emoji: '👍' }, { 'x-household-id': 'h-1' })
    const res = await route.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(null)
  })

  it('surfaces unique violation as 409 CONFLICT', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    reactionService.toggle.mockRejectedValue(conflict('Reaction already exists'))

    const req = makeReq({ transaction_id: 'tx-1', emoji: '👍' }, { 'x-household-id': 'h-1' })
    const res = await route.POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('CONFLICT')
  })
})

