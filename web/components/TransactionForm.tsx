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
      } catch {
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
        const j: unknown = await res.json().catch(() => null)
        let msg: string | undefined
        if (j && typeof j === 'object') {
          const maybe = j as { message?: unknown }
          if (typeof maybe.message === 'string') msg = maybe.message
        }
        throw new Error(msg || '登録に失敗しました')
      }
      // Success
      setOkMsg('取引を登録しました')
      const next = { ...initialDraft, kind: draft.kind }
      setDraft(next)
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
      } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登録に失敗しました'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCategories = React.useMemo(() => {
    return categories.filter((c) => c.type === draft.kind || c.type === 'both')
  }, [categories, draft.kind])

  return (
    <Card
      className="max-w-2xl mx-auto border-0 rounded-3xl p-0 overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(145deg, #f8fafc, #ffffff)',
        boxShadow: '20px 20px 60px #e2e8f0, -20px -20px 60px #ffffff',
        // Keep the card fully visible above the LumaBar and safe area (use dvh for mobile)
        maxHeight: 'calc(100dvh - (env(safe-area-inset-bottom) + 150px))'
      }}
    >
      <CardHeader className="rounded-t-3xl p-6 border-0">
        <div className="text-xl font-bold text-gray-800">取引登録</div>
        <div className="text-sm text-gray-600 mt-1">日々の入出金を記録して、支出管理に役立てましょう</div>
      </CardHeader>
      <CardBody
        className="p-6 sm:p-8 overflow-auto overscroll-contain"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)' }}
      >
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
        <form onSubmit={handleSubmit} className="grid gap-6 grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">種別</label>
            <div
              className="mt-2"
              style={{
                background: '#f0f0f0',
                boxShadow: 'inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff',
                borderRadius: '1rem'
              }}
            >
              <Select
                value={draft.kind}
                onChange={(value) => update('kind', value as Kind)}
                appearance="inset"
                variant="neumorphic"
                className="rounded-2xl bg-transparent"
                options={[
                  { value: "expense", label: "支出" },
                  { value: "income", label: "収入" }
                ]}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">日付</label>
            <div className="relative mt-2">
              <DatePicker
                value={draft.occurred_on}
                onChange={(e) => update('occurred_on', e.target.value)}
                className="border-0 rounded-2xl px-4 py-3 w-full"
                style={{
                  background: '#f0f0f0',
                  boxShadow: 'inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff'
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">金額</label>
            <div className="relative mt-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={draft.amount}
                onChange={(e) => update('amount', e.target.value)}
                className="border-0 rounded-2xl px-4 py-3 w-full pr-10"
                style={{
                  background: '#f0f0f0',
                  boxShadow: 'inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff'
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">円</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">カテゴリ</label>
            <div
              className="mt-2"
              style={{
                background: '#f0f0f0',
                boxShadow: 'inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff',
                borderRadius: '1rem'
              }}
            >
              <Select
                value={draft.category_id}
                onChange={(value) => update('category_id', value)}
                appearance="inset"
                variant="neumorphic"
                className="rounded-2xl bg-transparent"
                options={[
                  { value: "", label: "選択してください" },
                  ...filteredCategories.map((c) => ({ value: c.id, label: c.name }))
                ]}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">アカウント</label>
            <div
              className="mt-2"
              style={{
                background: '#f0f0f0',
                boxShadow: 'inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff',
                borderRadius: '1rem'
              }}
            >
              <Select
                value={draft.account_id}
                onChange={(value) => update('account_id', value)}
                appearance="inset"
                variant="neumorphic"
                className="rounded-2xl bg-transparent"
                options={[
                  { value: "", label: "選択してください" },
                  ...accounts.map((a) => ({ value: a.id, label: a.name }))
                ]}
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">利用場所（任意）</label>
            <Input
              placeholder="店名など"
              value={draft.place}
              onChange={(e) => update('place', e.target.value)}
              className="border-0 rounded-2xl px-4 py-3 mt-2 w-full"
              style={{
                background: '#f0f0f0',
                boxShadow: 'inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff'
              }}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">メモ（任意）</label>
            <Input
              placeholder="メモ"
              value={draft.memo}
              onChange={(e) => update('memo', e.target.value)}
              className="border-0 rounded-2xl px-4 py-3 mt-2 w-full"
              style={{
                background: '#f0f0f0',
                boxShadow: 'inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff'
              }}
            />
          </div>

          <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 justify-end pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-2xl border-0 transition-all duration-200 w-full sm:w-auto"
              style={{
                background: submitting
                  ? 'linear-gradient(145deg, #e0e0e0, #f0f0f0)'
                  : 'linear-gradient(145deg, #3b82f6, #2563eb)',
                boxShadow: submitting
                  ? 'inset 5px 5px 10px #d0d0d0, inset -5px -5px 10px #ffffff'
                  : '8px 8px 16px #2563eb40, -8px -8px 16px #ffffff40',
                color: submitting ? '#9ca3af' : 'white'
              }}
            >
              {submitting ? '登録中…' : '登録する'}
            </Button>
            <span className="self-center text-xs text-gray-500">
              {saving ? '下書き保存中…' : '下書き自動保存'}
            </span>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

