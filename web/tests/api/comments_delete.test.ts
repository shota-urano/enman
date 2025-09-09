import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/comments/[id]/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/commentsRepository', () => ({
  commentsRepository: {
    remove: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/commentsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
  } as unknown as NextRequest
}

describe('DELETE /api/comments/:id', () => {
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

    const req = makeReq()
    const res = await route.DELETE(req, { params: Promise.resolve({ id: 'cm-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('household scope required'))

    const req = makeReq()
    const res = await route.DELETE(req, { params: Promise.resolve({ id: 'cm-1' }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('deletes comment and returns 204 (owner only)', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    commentsRepository.remove.mockResolvedValue(undefined)

    const req = makeReq({ 'x-household-id': 'h-1' })
    const res = await route.DELETE(req, { params: Promise.resolve({ id: 'cm-1' }) })
    expect(res.status).toBe(204)
    expect(commentsRepository.remove).toHaveBeenCalledWith('h-1', 'cm-1', 'u-1')
  })
})

