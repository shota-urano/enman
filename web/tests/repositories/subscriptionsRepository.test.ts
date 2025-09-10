import { describe, it, expect, vi, beforeEach } from 'vitest'

import { subscriptionsRepository } from '@/server/repositories/subscriptionsRepository'
import { createSupabaseAdmin, type SupabaseAdminClient } from '@/server/clients/supabase'

vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }
const ok = <T,>(data: T): QueryResult<T> => ({ data, error: null } as QueryResult<T>)

interface SelectChain<T> {
  select: (s: string) => SelectChain<T>
  eq: (c: string, v: unknown) => SelectChain<T>
  order?: (c: string, o: { ascending: boolean }) => SelectChain<T> | Promise<QueryResult<T[]>>
  single?: () => Promise<QueryResult<T>>
}

describe('subscriptionsRepository', () => {

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('list returns subscriptions ordered', async () => {
    const rows = [
      {
        id: 's1',
        name: 'Netflix',
        expected_amount: 1000,
        category_id: 'c',
        account_id: 'a',
        billing_day: 10,
        note: null,
      },
    ]

    interface OrderableChain<T> {
      select: (s: string) => OrderableChain<T>
      eq: (c: string, v: unknown) => OrderableChain<T>
      order: (c: string, o: { ascending: boolean }) => OrderableChain<T> | Promise<QueryResult<T[]>>
    }
    const chain: OrderableChain<{
      id: string
      name: string
      expected_amount: number
      category_id: string
      account_id: string
      billing_day: number
      note: string | null
    }> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(),
    }
    let orderCalls = 0
    chain.order = vi.fn().mockImplementation(() => {
      orderCalls += 1
      if (orderCalls >= 2) return Promise.resolve(ok(rows))
      return chain
    })

    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseAdminClient)

    const result = await subscriptionsRepository.list('h1')
    expect(result).toEqual(rows)
    expect(chain.eq).toHaveBeenCalledWith('household_id', 'h1')
  })

  it('confirm calls RPC and fetches created transaction', async () => {
    const subRow = { id: 's1', expected_amount: 1200, billing_day: 15 }
    const txRow = {
      id: 'tx1',
      kind: 'expense',
      occurred_on: '2025-09-15',
      amount: 1200,
      category_id: 'c',
      account_id: 'a',
      place: null,
      memo: null,
    }

    const fromSelectSingle = vi.fn()
    fromSelectSingle.mockResolvedValueOnce(ok(subRow)) // first single() for subscription
    fromSelectSingle.mockResolvedValueOnce(ok(txRow)) // second single() for transaction fetch

    interface SingleChain<T> {
      select: (s: string) => SingleChain<T>
      eq: (c: string, v: unknown) => SingleChain<T>
      single: () => Promise<QueryResult<T>>
    }
    const fromChainFirst: SingleChain<{ id: string; expected_amount: number; billing_day: number }> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: fromSelectSingle,
    }

    const fromChainSecond: SingleChain<{
      id: string
      kind: 'income' | 'expense'
      occurred_on: string
      amount: number
      category_id: string
      account_id: string
      place: string | null
      memo: string | null
    }> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: fromSelectSingle,
    }

    const rpc: (fn: string, args: Record<string, unknown>) => Promise<QueryResult<unknown>> = vi
      .fn()
      .mockResolvedValue(ok([{ id: 'tx1' }]))

    const from = vi
      .fn()
      .mockReturnValueOnce(fromChainFirst)
      .mockReturnValueOnce(fromChainSecond)

    const createSupabaseAdminMock = vi.mocked(createSupabaseAdmin)
    createSupabaseAdminMock.mockReturnValue({
      from,
      rpc,
    } as unknown as SupabaseAdminClient)

    const result = await subscriptionsRepository.confirm('h', 's1', {
      userId: 'u1',
    })
    expect(result).toEqual(txRow)
    expect(rpc).toHaveBeenCalledWith('confirm_subscription_tx', expect.any(Object))
  })
})
