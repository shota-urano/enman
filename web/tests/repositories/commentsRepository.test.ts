import { describe, it, expect, vi, beforeEach } from 'vitest'

import { commentsRepository, type Comment } from '@/server/repositories/commentsRepository'
import { createSupabaseAdmin, type SupabaseAdminClient } from '@/server/clients/supabase'
import type { CommentCreateInput } from '@/server/schemas/comment'

vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }
const ok = <T,>(data: T): QueryResult<T> => ({ data, error: null } as QueryResult<T>)

interface SelectChain<T> {
  select: (s: string) => SelectChain<T>
  eq: (c: string, v: unknown) => SelectChain<T>
  order?: (c: string, o: { ascending: boolean }) => Promise<QueryResult<T[]>>
}

interface InsertChain<T> {
  insert: (row: unknown) => InsertChain<T>
  select: (s: string) => InsertChain<T>
  single: () => Promise<QueryResult<T>>
}

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

    const chain: SelectChain<Comment> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(ok(rows)),
    }

    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseAdminClient)

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
    const chain: InsertChain<Comment> = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(ok(created)),
    }
    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseAdminClient)

    const input: CommentCreateInput = { transaction_id: 't1', body: 'test' }
    const result = await commentsRepository.create('h', 'u1', input)
    expect(result).toEqual(created)
    expect(chain.insert).toHaveBeenCalled()
  })
})
