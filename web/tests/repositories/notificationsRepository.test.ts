import { describe, it, expect, vi, beforeEach } from 'vitest'

import { notificationsRepository, type Notification } from '@/server/repositories/notificationsRepository'

vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }
const ok = <T,>(data: T): QueryResult<T> => ({ data, error: null } as any)

import { createSupabaseAdmin } from '@/server/clients/supabase'

describe('notificationsRepository', () => {

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('list returns notifications; supports onlyUnread flag', async () => {
    const rows: Notification[] = [
      {
        id: 'n1',
        type: 'comment',
        payload: { t: 't1' },
        read: false,
        created_at: '2025-09-10T00:00:00Z',
      },
    ] as any

    const chainBase: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let orderCalls = 0
    chainBase.order = vi.fn().mockImplementation(() => {
      orderCalls += 1
      if (orderCalls >= 2) return Promise.resolve(ok(rows))
      return chainBase
    })

    const from = vi.fn().mockReturnValue(chainBase)

    ;(createSupabaseAdmin as any).mockReturnValue({ from })

    const result = await notificationsRepository.list('h1', 'u1', { onlyUnread: true })
    expect(result).toEqual(rows)
    expect(chainBase.eq).toHaveBeenCalledWith('read', false)
  })

  it('markRead updates and returns updated row', async () => {
    const updated: Notification = {
      id: 'n1',
      type: 'reaction',
      payload: {},
      read: true,
      created_at: '2025-09-10T00:00:00Z',
    } as any

    const chain: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(ok(updated)),
    }
    ;(createSupabaseAdmin as any).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    })

    const result = await notificationsRepository.markRead('h', 'u', 'n1')
    expect(result).toEqual(updated)
    expect(chain.update).toHaveBeenCalledWith({ read: true })
  })
})
