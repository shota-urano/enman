import { describe, it, expect, vi, beforeEach } from 'vitest'

// Module under test
import { transactionsRepository, type Transaction } from '@/server/repositories/transactionsRepository'
import { createSupabaseAdmin, type SupabaseAdminClient } from '@/server/clients/supabase'

// Mock supabase admin client factory
vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }

function ok<T>(data: T): QueryResult<T> {
  return { data, error: null } as QueryResult<T>
}

interface QueryChain<T> {
  select: (s: string) => QueryChain<T>
  eq: (c: string, v: unknown) => QueryChain<T>
  gte?: (c: string, v: unknown) => QueryChain<T>
  lt?: (c: string, v: unknown) => QueryChain<T>
  order?: (c: string, o: { ascending: boolean }) => QueryChain<T>
  then?: (resolve: (r: QueryResult<T[]>) => unknown) => unknown
}

interface InsertChain<T> {
  insert: (row: unknown) => InsertChain<T>
  select: (s: string) => InsertChain<T>
  single: () => Promise<QueryResult<T>>
}

describe('transactionsRepository', () => {

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('listByMonth returns ordered transactions and supports kind filter', async () => {
    const records: Transaction[] = [
      {
        id: 't1',
        kind: 'expense',
        occurred_on: '2025-09-02',
        amount: 1200,
        category_id: 'c1',
        account_id: 'a1',
        place: null,
        memo: null,
      },
    ]

    const chain: QueryChain<Transaction> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn(),
      then: undefined,
    }
    chain.order = vi.fn().mockReturnValue(chain)
    // Make the builder thenable so `await query` resolves to `{ data, error }`
    chain.then = (resolve: (v: QueryResult<Transaction[]>) => unknown) => resolve(ok(records))
    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        ...chain,
        then: undefined,
      }),
    } as unknown as SupabaseAdminClient)

    // final awaited value resolved via order implementation above

    const result = await transactionsRepository.listByMonth('h1', '2025-09', 'expense')
    expect(result).toEqual(records)

    expect(vi.mocked(createSupabaseAdmin).mock.calls.length).toBe(1)
    expect(chain.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(chain.gte).toHaveBeenCalledWith('occurred_on', '2025-09-01')
    expect(chain.lt).toHaveBeenCalledWith('occurred_on', '2025-10-01')
    expect(chain.eq).toHaveBeenCalledWith('kind', 'expense')
  })

  it('create inserts and returns created row', async () => {
    const created: Transaction = {
      id: 'tx-new',
      kind: 'income',
      occurred_on: '2025-09-09',
      amount: 3000,
      category_id: 'cat',
      account_id: 'acc',
      place: null,
      memo: 'hello',
    }

    const chain: InsertChain<Transaction> = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(ok(created)),
    }
    const createSupabaseAdminMock2 = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock2.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseAdminClient)

    const result = await transactionsRepository.create('house', {
      kind: 'income',
      occurred_on: '2025-09-09',
      amount: 3000,
      category_id: 'cat',
      account_id: 'acc',
      memo: 'hello',
    })

    expect(result).toEqual(created)
    expect(chain.insert).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
  })
})
