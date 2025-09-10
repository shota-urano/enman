import { describe, it, expect, vi, beforeEach } from 'vitest'

import { commentsRepository, type Comment } from '@/server/repositories/commentsRepository'

vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }
const ok = <T,>(data: T): QueryResult<T> => ({ data, error: null } as any)

import { createSupabaseAdmin } from '@/server/clients/supabase'

describe('commentsRepository', () => {

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('listByTransaction returns ordered comments', async () => {
    const rows: Comment[] = [
      {
        id: 'c1',
        transaction_id: 't1',
        body: 'hi',
        created_by: 'u1',
        created_at: '2025-09-10T00:00:00Z',
      },
    ]

    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(ok(rows)),
    }

    ;(createSupabaseAdmin as any).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    })

    const result = await commentsRepository.listByTransaction('h1', 't1')
    expect(result).toEqual(rows)
    expect(chain.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(chain.eq).toHaveBeenCalledWith('transaction_id', 't1')
  })

  it('create inserts and returns created comment', async () => {
    const created: Comment = {
      id: 'c2',
      transaction_id: 't1',
      body: 'test',
      created_by: 'u1',
      created_at: '2025-09-10T00:00:00Z',
    }
    const chain: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(ok(created)),
    }
    ;(createSupabaseAdmin as any).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    })

    const result = await commentsRepository.create('h', 'u1', {
      transaction_id: 't1',
      body: 'test',
    } as any)
    expect(result).toEqual(created)
    expect(chain.insert).toHaveBeenCalled()
  })
})
