import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/comments/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/commentsRepository', () => ({
  commentsRepository: {
    listByTransaction: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/commentsRepository'
import type { Comment } from '@/server/repositories/commentsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(url: string, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return { headers: h, url } as unknown as NextRequest
}

describe('GET /api/comments', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const commentsRepository = vi.mocked(repoModule.commentsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq('http://test.local/api/comments')
    const res = await route.GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))
    const req = makeReq('http://test.local/api/comments')
    const res = await route.GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('validates transaction_id presence', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const req = makeReq('http://test.local/api/comments')
    const res = await route.GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 200 with comments list', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Comment[] = [
      {
        id: 'cm-1',
        transaction_id: 'tx-1',
        body: 'テストコメント',
        created_by: 'u-1',
        created_at: '2025-09-02T12:00:00Z',
      },
    ]
    commentsRepository.listByTransaction.mockResolvedValue(list)

    const req = makeReq('http://test.local/api/comments?transaction_id=tx-1', {
      'x-household-id': 'h-1',
    })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(list)
    expect(commentsRepository.listByTransaction).toHaveBeenCalledWith('h-1', 'tx-1')
  })
})

