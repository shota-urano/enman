import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/notifications/[id]/read/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/notificationsRepository', () => ({
  notificationsRepository: {
    markRead: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/notificationsRepository'
import type { Notification } from '@/server/repositories/notificationsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'

function makeReq(url: string, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return { headers: h, url } as unknown as NextRequest
}

describe('POST /api/notifications/:id/read', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const notificationsRepository = vi.mocked(repoModule.notificationsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())
    const req = makeReq('https://example.com/api/notifications/n-1/read')
    const res = await route.POST(req, { params: Promise.resolve({ id: 'n-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))
    const req = makeReq('https://example.com/api/notifications/n-1/read')
    const res = await route.POST(req, { params: Promise.resolve({ id: 'n-1' }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('marks notification as read and returns updated entity', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const updated: Notification = {
      id: 'n-1',
      type: 'comment',
      payload: { comment_id: 'c-1' },
      read: true,
      created_at: new Date().toISOString(),
    }
    notificationsRepository.markRead.mockResolvedValue(updated)

    const req = makeReq('https://example.com/api/notifications/n-1/read', {
      'x-household-id': 'h-1',
    })
    const res = await route.POST(req, { params: Promise.resolve({ id: 'n-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(updated)
    expect(notificationsRepository.markRead).toHaveBeenCalledWith('h-1', 'u-1', 'n-1')
  })
})

