import { describe, it, expect, vi, beforeEach } from 'vitest'

import { reactionsRepository, type Reaction } from '@/server/repositories/reactionsRepository'
import { createSupabaseAdmin, type SupabaseAdminClient } from '@/server/clients/supabase'

vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }
const ok = <T,>(data: T): QueryResult<T> => ({ data, error: null } as QueryResult<T>)

interface SelectChain<T> {
  select: (s: string) => SelectChain<T>
  eq: (c: string, v: unknown) => SelectChain<T>
  order?: (c: string, o: { ascending: boolean }) => Promise<QueryResult<T[]>>
  maybeSingle?: () => Promise<QueryResult<T | null>>
}

describe('reactionsRepository', () => {

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('listByTransaction returns ordered reactions', async () => {
    const rows: Reaction[] = [
      {
        id: 'r1',
        transaction_id: 't1',
        emoji: '👍',
        user_id: 'u1',
        created_at: '2025-09-10T00:00:00Z',
      },
    ]

    const chain: SelectChain<Reaction> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(ok(rows)),
    }

    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseAdminClient)

    const result = await reactionsRepository.listByTransaction('h1', 't1')
    expect(result).toEqual(rows)
    expect(chain.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(chain.eq).toHaveBeenCalledWith('transaction_id', 't1')
  })

  it('findByUserAndTransaction returns a reaction or null', async () => {
    const one: Reaction = {
      id: 'r2',
      transaction_id: 't1',
      emoji: '❤️',
      user_id: 'u2',
      created_at: '2025-09-10T00:00:00Z',
    }

    const chain: SelectChain<Reaction> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(ok(one)),
    }
    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseAdminClient)

    const found = await reactionsRepository.findByUserAndTransaction('h', 't1', 'u2')
    expect(found).toEqual(one)
  })
})
