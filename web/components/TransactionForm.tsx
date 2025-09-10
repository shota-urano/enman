"use client"
import React from 'react'
import { Card, CardBody, CardHeader } from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { DatePicker } from './ui/date-picker'
import { Button } from './ui/button'

type Kind = 'income' | 'expense'

type Category = {
  id: string
  name: string
  type: 'income' | 'expense' | 'both'
}

type Account = {
  id: string
  name: string
  type: 'cash' | 'bank' | 'card' | 'other'
}

type TxDraft = {
  kind: Kind
  occurred_on: string
  amount: string
  category_id: string
  account_id: string
  place: string
  memo: string
}

const DRAFT_KEY = 'transaction_form_draft'

const initialDraft: TxDraft = {
  kind: 'expense',
  occurred_on: new Date().toISOString().slice(0, 10),
  amount: '',
  category_id: '',
  account_id: '',
  place: '',
  memo: '',
}

export default function TransactionForm() {
  const [draft, setDraft] = React.useState<TxDraft>(() => {
    if (typeof window === 'undefined') return initialDraft
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) return { ...initialDraft, ...JSON.parse(raw) }
    } catch {}
    return initialDraft
  })
  const [saving, setSaving] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [okMsg, setOkMsg] = React.useState<string | null>(null)

  const [categories, setCategories] = React.useState<Category[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])

  // Load options
  React.useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [cRes, aRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/accounts'),
        ])
        if (!alive) return
        if (cRes.ok) {
          const c = (await cRes.json()) as Category[]
          setCategories(c)
        }
        if (aRes.ok) {
          const a = (await aRes.json()) as Account[]
          setAccounts(a)
        }
      } catch (e) {
        // ignore; error surfaced on submit if needed
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  // Debounced autosave every 500ms
  React.useEffect(() => {
    const id = setTimeout(() => {
      try {
        setSaving(true)
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [draft])

  function update<K extends keyof TxDraft>(key: K, val: TxDraft[K]) {
    setDraft((d) => ({ ...d, [key]: val }))
  }

  function validate(): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.occurred_on)) return '日付はYYYY-MM-DD形式で入力してください'
    const amount = Number(draft.amount)
    if (!Number.isInteger(amount) || amount < 0) return '金額は0以上の整数を入力してください'
    if (!draft.category_id) return 'カテゴリを選択してください'
    if (!draft.account_id) return 'アカウントを選択してください'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: draft.kind,
          occurred_on: draft.occurred_on,
          amount: Number(draft.amount),
          category_id: draft.category_id,
          account_id: draft.account_id,
          place: draft.place || undefined,
          memo: draft.memo || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any))
        throw new Error(j?.message || '登録に失敗しました')
      }
      // Success
      setOkMsg('取引を登録しました')
      const next = { ...initialDraft, kind: draft.kind }
      setDraft(next)
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
      } catch {}
    } catch (e: any) {
      setError(e?.message || '登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCategories = React.useMemo(() => {
    return categories.filter((c) => c.type === draft.kind || c.type === 'both')
  }, [categories, draft.kind])

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <h2 className="text-lg font-semibold">取引登録</h2>
      </CardHeader>
      <CardBody>
        {error && (
          <div className="mb-3 text-red-600 text-sm" role="alert">
            {error}
          </div>
        )}
        {okMsg && (
          <div className="mb-3 text-green-700 text-sm" role="status">
            {okMsg}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">種別</label>
            <Select
              value={draft.kind}
              onChange={(e) => update('kind', e.target.value as Kind)}
            >
              <option value="expense">支出</option>
              <option value="income">収入</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">日付</label>
            <DatePicker
              value={draft.occurred_on}
              onChange={(e) => update('occurred_on', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">金額</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={draft.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">カテゴリ</label>
            <Select
              value={draft.category_id}
              onChange={(e) => update('category_id', e.target.value)}
            >
              <option value="">選択してください</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">アカウント</label>
            <Select
              value={draft.account_id}
              onChange={(e) => update('account_id', e.target.value)}
            >
              <option value="">選択してください</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">利用場所（任意）</label>
            <Input
              placeholder="店名など"
              value={draft.place}
              onChange={(e) => update('place', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">メモ（任意）</label>
            <Input
              placeholder="メモ"
              value={draft.memo}
              onChange={(e) => update('memo', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? '登録中…' : '登録する'}
            </Button>
            <span className="text-xs text-gray-500">
              {saving ? '下書き保存中…' : '下書き自動保存'}
            </span>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

