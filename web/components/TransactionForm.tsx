"use client"
import React from 'react'
import { useToast } from '@/components/ui/toast'
import { Card, CardBody, CardHeader } from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { DatePicker } from './ui/date-picker'
import { Button } from './ui/button'
import PlaceSelector, { type PlaceSelectorValue, createEmptyPlaceValue } from '@/components/PlaceSelector'

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
  location: PlaceSelectorValue
  placeText: string
  memoryFlag: boolean
  memo: string
}

const DRAFT_KEY = 'transaction_form_draft'

function getToday(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function createInitialDraft(): TxDraft {
  return {
    kind: 'expense',
    occurred_on: getToday(),
    amount: '',
    category_id: '',
    account_id: '',
    location: createEmptyPlaceValue(),
    placeText: '',
    memoryFlag: false,
    memo: '',
  }
}

export default function TransactionForm() {
  const [draft, setDraft] = React.useState<TxDraft>(() => {
    const baseDraft = createInitialDraft()
    if (typeof window === 'undefined') return baseDraft
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TxDraft> & { place?: string }
        const location = (() => {
          if (parsed.location && typeof parsed.location === 'object') {
            return {
              placeId: parsed.location.placeId ?? null,
              sessionToken: null,
              name: parsed.location.name ?? '',
              formattedAddress: parsed.location.formattedAddress ?? '',
            }
          }
          if (typeof parsed.place === 'string' && parsed.place.trim()) {
            const fallback = createEmptyPlaceValue()
            return { ...fallback, name: parsed.place.trim() }
          }
          return createEmptyPlaceValue()
        })()
        const placeText =
          typeof parsed.placeText === 'string'
            ? parsed.placeText
            : typeof parsed.place === 'string'
              ? parsed.place
              : ''
        return {
          ...baseDraft,
          ...parsed,
          location,
          placeText,
          memoryFlag: parsed.memoryFlag ?? false,
        }
      }
    } catch {}
    return baseDraft
  })
  const [saving, setSaving] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const { show } = useToast()

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
    if (draft.memoryFlag && !draft.location.placeId) return '思い出マップに登録する場合は場所を選択してください'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) {
      show(err, 'error')
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        kind: draft.kind,
        occurred_on: draft.occurred_on,
        amount: Number(draft.amount),
        category_id: draft.category_id,
        account_id: draft.account_id,
        memo: draft.memo || undefined,
      }

      if (draft.memoryFlag) {
        const placeName = draft.location.name.trim()
        payload.place = placeName ? placeName : undefined
        payload.place_id = draft.location.placeId || undefined
        payload.place_session_token = draft.location.sessionToken || undefined
        payload.memory_flag = true
      } else {
        const placeText = draft.placeText.trim()
        payload.place = placeText ? placeText : undefined
        payload.memory_flag = false
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      show('取引を登録しました', 'success')
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      const baseDraft = createInitialDraft()
      const next: TxDraft = {
        ...baseDraft,
        kind: draft.kind,
        location: createEmptyPlaceValue(),
        placeText: '',
      }
      setDraft(next)
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
      } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登録に失敗しました'
      show(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCategories = React.useMemo(() => {
    return categories.filter((c) => c.type === draft.kind || c.type === 'both')
  }, [categories, draft.kind])

  return (
    <Card
      className="mx-auto flex max-w-2xl flex-col overflow-hidden rounded-[36px] border border-white/60 bg-white/70 shadow-neumorphic"
      style={{
        // Keep the card fully visible above the LumaBar and safe area (use dvh for mobile)
        maxHeight: 'calc(100dvh - (env(safe-area-inset-bottom) + 150px))',
      }}
    >
      <CardHeader className="flex-col items-start gap-1 rounded-t-[36px] border-0 bg-white/60 px-8 py-6">
        <div className="text-xl font-semibold text-foreground whitespace-nowrap">取引登録</div>
        <div className="mt-1 text-sm text-muted-foreground">日々の入出金を記録して、支出管理に役立てましょう</div>
      </CardHeader>
      <CardBody
        ref={bodyRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 pb-8 pt-6 sm:px-10"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 110px)' }}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">種別</label>
            <Select
              value={draft.kind}
              onChange={(value) => update('kind', value as Kind)}
              appearance="inset"
              variant="neumorphic"
              className="mt-2"
              options={[
                { value: "expense", label: "支出" },
                { value: "income", label: "収入" },
              ]}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">日付</label>
            <div className="relative mt-2">
              <DatePicker
                value={draft.occurred_on}
                onChange={(e) => update('occurred_on', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">金額</label>
            <div className="relative mt-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={draft.amount}
                onChange={(e) => update('amount', e.target.value)}
                className="pr-14"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">円</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">カテゴリ</label>
            <Select
              value={draft.category_id}
              onChange={(value) => update('category_id', value)}
              appearance="inset"
              variant="neumorphic"
              className="mt-2"
              options={[
                { value: "", label: "選択してください" },
                ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">アカウント</label>
            <Select
              value={draft.account_id}
              onChange={(value) => update('account_id', value)}
              appearance="inset"
              variant="neumorphic"
              className="mt-2"
              options={[
                { value: "", label: "選択してください" },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          </div>

          <div className="sm:col-span-2 space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">思い出マップ</label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                <input
                  id="memory-flag"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draft.memoryFlag}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setDraft((prev) => {
                      if (checked) {
                        return { ...prev, memoryFlag: true }
                      }
                      const fallbackText = prev.location.name || prev.placeText
                      return {
                        ...prev,
                        memoryFlag: false,
                        location: createEmptyPlaceValue(),
                        placeText: fallbackText,
                      }
                    })
                  }}
                />
                <label htmlFor="memory-flag" className="text-sm text-foreground">
                  思い出マップに登録する
                </label>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                チェックすると Google の場所検索を使ってピンを登録できます（確定時のみ課金）。
              </p>
            </div>
            {draft.memoryFlag ? (
              <>
                <PlaceSelector
                  value={draft.location}
                  onChange={(val) => update('location', val)}
                />
                {draft.memoryFlag && !draft.location.placeId && (
                  <p className="text-xs text-destructive">登録には場所の選択が必要です</p>
                )}
              </>
            ) : (
              <div>
                <label className="text-sm font-medium text-muted-foreground">利用場所（任意）</label>
                <Input
                  placeholder="店名など"
                  value={draft.placeText}
                  onChange={(e) => update('placeText', e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-muted-foreground">メモ（任意）</label>
            <Input
              placeholder="メモ"
              value={draft.memo}
              onChange={(e) => update('memo', e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col justify-end gap-3 pt-4 sm:flex-row">
            <Button
              type="submit"
              disabled={submitting}
              className={`w-full px-8 py-3 text-base sm:w-auto ${
                submitting
                  ? 'shadow-neumorphic-pressed text-muted-foreground'
                  : 'bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] text-white shadow-neumorphic-soft'
              }`}
            >
              {submitting ? '登録中…' : '登録する'}
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              {saving ? '下書き保存中…' : '下書き自動保存'}
            </span>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
