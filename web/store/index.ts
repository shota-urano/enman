import { create } from 'zustand'

// Minimal client-side types for store usage
export type User = { id: string; email?: string | null }
export type Transaction = {
  id: string
  kind: 'income' | 'expense'
  occurred_on: string // YYYY-MM-DD
  amount: number
  category_id: string
  account_id: string
  place?: string | null
  memo?: string | null
  created_by: string
}

export type DailyTotal = {
  date: string // YYYY-MM-DD
  income: number
  expense: number
}

type AuthState = {
  user: User | null
  householdId: string | null
  setUser: (user: User | null) => void
  setHousehold: (householdId: string | null) => void
}

type TxState = {
  month: string
  transactions: Transaction[]
  loadMonth: (m: string) => Promise<void>
  createTx: (input: Omit<Transaction, 'id'>) => Promise<Transaction>
  confirmSubscription: (id: string, amount: number) => Promise<void>
}

type UiToast = { type: 'success' | 'error'; message: string }
type UiState = {
  toast: UiToast | null
  showToast: (toast: UiToast) => void
  clearToast: () => void
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  householdId: null,
  setUser: (user) => set({ user }),
  setHousehold: (householdId) => set({ householdId }),
}))

export const useTx = create<TxState>()((set, get) => ({
  month: '',
  transactions: [],
  async loadMonth(m: string) {
    const res = await fetch(`/api/transactions?month=${encodeURIComponent(m)}`)
    if (!res.ok) throw new Error('取引の取得に失敗しました')
    const data: Transaction[] = await res.json()
    set({ month: m, transactions: data })
  },
  async createTx(input) {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: input.kind,
        occurred_on: input.occurred_on,
        amount: input.amount,
        category_id: input.category_id,
        account_id: input.account_id,
        place: input.place,
        memo: input.memo,
      }),
    })
    if (!res.ok) throw new Error('取引の作成に失敗しました')
    const created: Transaction = await res.json()
    const month = get().month
    // If current month matches created tx month, append optimistically
    if (month && created.occurred_on.startsWith(month)) {
      set({ transactions: [...get().transactions, created] })
    }
    return created
  },
  async confirmSubscription(id: string, amount: number) {
    const res = await fetch(`/api/subscriptions/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    if (!res.ok) throw new Error('サブスクの確認に失敗しました')
    // refresh current month after confirm to reflect new transaction
    const m = get().month
    if (m) await get().loadMonth(m)
  },
}))

export const useUi = create<UiState>()((set) => ({
  toast: null,
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}))

// Selectors (simple helpers)
export function selectDayTotals(transactions: Transaction[], date: string): DailyTotal {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.occurred_on === date) {
      if (t.kind === 'income') income += t.amount
      else expense += t.amount
    }
  }
  return { date, income, expense }
}

export function selectSumByCategory(
  transactions: Transaction[],
  month: string
): Record<string, { income: number; expense: number }> {
  const result: Record<string, { income: number; expense: number }> = {}
  for (const t of transactions) {
    if (!t.occurred_on.startsWith(month)) continue
    if (!result[t.category_id]) result[t.category_id] = { income: 0, expense: 0 }
    if (t.kind === 'income') result[t.category_id].income += t.amount
    else result[t.category_id].expense += t.amount
  }
  return result
}

