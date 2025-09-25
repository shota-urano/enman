import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/comments/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/services/commentService', () => ({
  commentService: {
    create: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as serviceModule from '@/server/services/commentService'
import type { Comment } from '@/server/repositories/commentsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  const h = new Headers(headers)
  const req = {
    headers: h,
    url,
    json: async () => body,
  } as Partial<NextRequest> & { json: () => Promise<unknown> }
  return req as unknown as NextRequest
}

describe('POST /api/comments', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const commentService = vi.mocked(serviceModule.commentService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq('http://test.local/api/comments', { transaction_id: 'tx-1', body: 'hi' })
    const res = await route.POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))
    const req = makeReq('http://test.local/api/comments', { transaction_id: 'tx-1', body: 'hi' })
    const res = await route.POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('validates input shape', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const req = makeReq('http://test.local/api/comments', { body: '' }, { 'x-household-id': 'h-1' })
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('creates comment and returns 201', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const created: Comment = {
      id: 'cm-1',
      transaction_id: 'tx-1',
      body: 'テストコメント',
      created_by: 'u-1',
      created_at: '2025-09-02T12:00:00Z',
    }
    commentService.create.mockResolvedValue(created)

    const req = makeReq(
      'http://test.local/api/comments',
      { transaction_id: 'tx-1', body: 'テストコメント' },
      { 'x-household-id': 'h-1' },
    )
    const res = await route.POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual(created)
    expect(commentService.create).toHaveBeenCalledWith(
      {
        transaction_id: 'tx-1',
        body: 'テストコメント',
      },
      { userId: 'u-1', token: 't', householdId: 'h-1' },
    )
  })
})

