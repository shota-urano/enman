import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/notifications/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/notificationsRepository', () => ({
  notificationsRepository: {
    list: vi.fn(),
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

describe('GET /api/notifications', () => {
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
    const req = makeReq('https://example.com/api/notifications')
    const res = await route.GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))
    const req = makeReq('https://example.com/api/notifications')
    const res = await route.GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('returns 200 with notifications list (all, unread-first)', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Notification[] = [
      {
        id: 'n-2',
        type: 'comment',
        payload: { comment_id: 'c-1' },
        read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'n-1',
        type: 'reaction',
        payload: { reaction: 'like' },
        read: true,
        created_at: new Date().toISOString(),
      },
    ]
    notificationsRepository.list.mockResolvedValue(list)

    const req = makeReq('https://example.com/api/notifications', {
      'x-household-id': 'h-1',
    })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(list)
    expect(notificationsRepository.list).toHaveBeenCalledWith('h-1', 'u-1', {
      onlyUnread: false,
    })
  })

  it('filters only unread when read=false', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()
    const list: Notification[] = []
    notificationsRepository.list.mockResolvedValue(list)

    const req = makeReq('https://example.com/api/notifications?read=false', {
      'x-household-id': 'h-1',
    })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    await res.json()
    expect(notificationsRepository.list).toHaveBeenCalledWith('h-1', 'u-1', {
      onlyUnread: true,
    })
  })
})

