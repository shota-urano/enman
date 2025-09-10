import { describe, it, expect, vi, beforeEach } from 'vitest'

import { subscriptionsRepository } from '@/server/repositories/subscriptionsRepository'

vi.mock('@/server/clients/supabase', () => ({
  createSupabaseAdmin: vi.fn(),
}))

type QueryResult<T> = { data: T; error: null } | { data: null; error: Error }
const ok = <T,>(data: T): QueryResult<T> => ({ data, error: null } as any)

import { createSupabaseAdmin } from '@/server/clients/supabase'

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

    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let orderCalls = 0
    chain.order = vi.fn().mockImplementation(() => {
      orderCalls += 1
      if (orderCalls >= 2) return Promise.resolve(ok(rows))
      return chain
    })

    ;(createSupabaseAdmin as any).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    })

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

    const fromChainFirst: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: fromSelectSingle,
    }

    const fromChainSecond: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: fromSelectSingle,
    }

    const rpc = vi.fn().mockResolvedValue(ok([{ id: 'tx1' }]))

    const from = vi
      .fn()
      .mockReturnValueOnce(fromChainFirst)
      .mockReturnValueOnce(fromChainSecond)

    ;(createSupabaseAdmin as any).mockReturnValue({
      from,
      rpc,
    })

    const result = await subscriptionsRepository.confirm('h', 's1', {
      userId: 'u1',
    })
    expect(result).toEqual(txRow)
    expect(rpc).toHaveBeenCalledWith('confirm_subscription_tx', expect.any(Object))
  })
})
