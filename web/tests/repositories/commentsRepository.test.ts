import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

vi.mock('@/server/repositories/profilesRepository', () => ({
  profilesRepository: {
    list: vi.fn(),
    ensure: vi.fn(),
    DEFAULT_NAME: 'ななし',
  },
}))

import { commentsRepository, type Comment } from '@/server/repositories/commentsRepository'
import { createSupabaseAdmin, type SupabaseAdminClient } from '@/server/clients/supabase'
import { profilesRepository } from '@/server/repositories/profilesRepository'
import type { CommentCreateInput } from '@/server/schemas/comment'

const profilesRepositoryMock = vi.mocked(profilesRepository)

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }
const ok = <T,>(data: T): QueryResult<T> => ({ data, error: null } as QueryResult<T>)

interface SelectChain<T> {
  select: (s: string) => SelectChain<T>
  eq: (c: string, v: unknown) => SelectChain<T>
  in?: (c: string, v: unknown[]) => SelectChain<T>
  order?: (c: string, o: { ascending: boolean }) => Promise<QueryResult<T[]>>
}

interface InsertChain<T> {
  insert: (row: unknown) => InsertChain<T>
  select: (s: string) => InsertChain<T>
  single: () => Promise<QueryResult<T>>
}

describe('commentsRepository', () => {

  beforeEach(() => {
    vi.clearAllMocks()
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
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(ok(rows)),
    }

    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseAdminClient)

    profilesRepositoryMock.list.mockResolvedValue({
      u1: {
        user_id: 'u1',
        display_name: 'ユーザー1',
        avatar_path: null,
        avatar_url: 'https://example.com/avatar.png',
        latest_walkthrough_version: null,
      },
    })

    const result = await commentsRepository.listByTransaction('h1', 't1')
    expect(result).toEqual([
      {
        ...rows[0],
        author: {
          user_id: 'u1',
          display_name: 'ユーザー1',
          avatar_url: 'https://example.com/avatar.png',
        },
      },
    ])
    expect(chain.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(chain.eq).toHaveBeenCalledWith('transaction_id', 't1')
    expect(profilesRepositoryMock.list).toHaveBeenCalledWith(['u1'])
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

    profilesRepositoryMock.ensure.mockResolvedValue({
      user_id: 'u1',
      display_name: 'ユーザー1',
      avatar_path: null,
      avatar_url: 'https://example.com/avatar.png',
      latest_walkthrough_version: null,
    })

    const input: CommentCreateInput = { transaction_id: 't1', body: 'test' }
    const result = await commentsRepository.create('h', 'u1', input)
    expect(result).toEqual({
      ...created,
      author: {
        user_id: 'u1',
        display_name: 'ユーザー1',
        avatar_url: 'https://example.com/avatar.png',
      },
    })
    expect(chain.insert).toHaveBeenCalled()
    expect(profilesRepositoryMock.ensure).toHaveBeenCalledWith('u1')
  })
})
