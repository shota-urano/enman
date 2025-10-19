import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

import * as route from '@/app/api/transactions/route'

vi.mock('@/server/utils/auth', () => ({
  getSession: vi.fn(),
  assertHouseholdMember: vi.fn(),
}))

vi.mock('@/server/repositories/transactionsRepository', () => ({
  transactionsRepository: {
    create: vi.fn(),
  },
}))

import * as authModule from '@/server/utils/auth'
import type { Session } from '@/server/utils/auth'
import * as repoModule from '@/server/repositories/transactionsRepository'
import type { Transaction } from '@/server/repositories/transactionsRepository'
import { unauthorized, forbidden } from '@/server/utils/errors'
import { txCreateSchema } from '@/server/schemas/transaction'

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers)
  return {
    headers: h,
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/transactions', () => {
  const getSession = vi.mocked(authModule.getSession)
  const assertHouseholdMember = vi.mocked(authModule.assertHouseholdMember)
  const transactionsRepository = vi.mocked(repoModule.transactionsRepository)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when body is invalid', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const req = makeReq({})
    const res = await route.POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 when unauthorized', async () => {
    getSession.mockRejectedValue(unauthorized())

    const req = makeReq({
      kind: 'expense',
      occurred_on: '2025-09-02',
      amount: 1200,
      category_id: '11111111-1111-1111-1111-111111111111',
      account_id: '22222222-2222-2222-2222-222222222222',
      place: 'スーパー',
      memo: '夕飯',
    })
    const res = await route.POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when household scope missing', async () => {
    const session: Session = { userId: 'u-1', token: 't' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockRejectedValue(forbidden('世帯スコープが必要です'))

    const req = makeReq({
      kind: 'expense',
      occurred_on: '2025-09-02',
      amount: 1200,
      category_id: '11111111-1111-1111-1111-111111111111',
      account_id: '22222222-2222-2222-2222-222222222222',
    })
    const res = await route.POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('creates transaction and returns 201', async () => {
    const session: Session = { userId: 'u-1', token: 't', householdId: 'h-1' }
    getSession.mockResolvedValue(session)
    assertHouseholdMember.mockResolvedValue()

    const tx: Transaction = {
      id: 't-1',
      kind: 'expense',
      occurred_on: '2025-09-02',
      amount: 1200,
      category_id: '11111111-1111-1111-8aaa-111111111111',
      account_id: '22222222-2222-2222-8bbb-222222222222',
      place: 'スーパー',
      memory_flag: false,
      memo: '夕飯',
      created_by: 'u-1',
    }
    transactionsRepository.create.mockResolvedValue(tx)

    const input = {
      kind: 'expense',
      occurred_on: '2025-09-02',
      amount: 1200,
      category_id: '11111111-1111-1111-8aaa-111111111111',
      account_id: '22222222-2222-2222-8bbb-222222222222',
      place: 'スーパー',
      memo: '夕飯',
    }
    const req = makeReq(input, { 'x-household-id': 'h-1' })
    const res = await route.POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual(tx)
    expect(transactionsRepository.create).toHaveBeenCalledWith('h-1', 'u-1', input, { accessToken: 't' })
  })

  it('accepts valid payload via schema', () => {
    const input = {
      kind: 'expense',
      occurred_on: '2025-09-02',
      amount: 1200,
      category_id: '11111111-1111-1111-8aaa-111111111111',
      account_id: '22222222-2222-2222-8bbb-222222222222',
      place: 'スーパー',
      memo: '夕飯',
    }
    const parsed = txCreateSchema.safeParse(input)
    if (!parsed.success) {
      // Debug output for schema issues
      console.log(parsed.error.issues)
    }
    expect(parsed.success).toBe(true)
  })
})
